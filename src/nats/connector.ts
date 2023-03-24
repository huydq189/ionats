import {
    connect,
    ConsumerConfig,
    ConsumerOpts,
    consumerOpts,
    ConsumerOptsBuilder,
    JetStreamClient,
    JetStreamManager,
    JetStreamPublishOptions,
    JSONCodec,
    NatsConnection,
    PullOptions,
    RequestOptions,
    StringCodec,
    SubscriptionOptions,
} from 'nats';
import { Config, PersistentConfigurationAction } from './config';
import { Options, OptionsBuilder } from './options';
import { error, StreamOption } from './types/options.type';

type JetStreamContext = {
    jsm: JetStreamManager;
    jsc: JetStreamClient;
};
// MsgCon is a messaging connector able to connect to the messaging infrastructure
// NewMessagingConnector creates a new messaging connector with the given config
// It does not yet actually connect to the messaging infrastructure.
// Use Connect for that.

export class MessagingConnector {
    #config: Config;
    #options: Options;
    #connected: boolean;
    #disconnected: boolean;
    #natsContext: NatsConnection;
    jetStreamContext: JetStreamContext;

    get encoder(): typeof JSONCodec | typeof StringCodec {
        return this.#options.encoder;
    }

    constructor(config: Config) {
        this.#config = config;
        this.#connected = false;
        this.#disconnected = false;
        this.#natsContext = {} as any as NatsConnection;
        this.jetStreamContext = {} as any as JetStreamContext;
        this.#options = new Options();
    }

    /**
     * SetOptions sets the given options on the messaging connector.
     * Options are meant to be set by the calling application.
     * For configuration supplied during deployment see Config.
     *
     * Options set will be overwritten, not merged.
     *
     * This method must be called before calling Connect.
     * Returns an error if the messaging connector is already connected.
     *
     * Example setting some options:
     * mc := new MessagingConnector(...)
     * MessagingConnector.OptionsBuilder().setA().setB().build()
     * @param opts
     */
    setOptions(builder: OptionsBuilder) {
        this.#options = builder.build();
    }

    optionsBuilder(): OptionsBuilder {
        return new OptionsBuilder();
    }

    async configureRequiredStreams() {
        const missingStreams: Map<string, StreamOption> = new Map();
        for (const stream of this.#options.requiredStreams) {
            missingStreams.set(stream.name, stream);
        }

        const streams = await this.jetStreamContext.jsm.streams.list().next();
        for (const stream of streams) {
            missingStreams.delete(stream.config.name);
        }
        for (const [name, stream] of missingStreams) {
            if (this.#config.requiredStreamsConfigurationAction == PersistentConfigurationAction.DoNotTouch) {
                throw new Error(
                    `Required jetStream stream with name '${name}' is missing, but RequiredStreamsConfigurationAction is DoNotTouch.`,
                );
            } else {
                await this.jetStreamContext.jsm.streams.add(stream);
                console.log('Stream added - name: ', stream.name);
            }
        }

        for (const stream of this.#options.requiredStreams) {
            if (
                this.#config.requiredStreamsConfigurationAction === PersistentConfigurationAction.AlwaysUpdate
            ) {
                await this.jetStreamContext.jsm.streams.update(stream.name, stream);
            }
        }
    }

    async configureRequiredConsumers() {
        for (const [streamName, requiredConsumers] of Object.entries(this.#options.requiredConsumers)) {
            const missingConsumers: Map<string, Partial<ConsumerConfig>> = new Map();

            for (const consumer of requiredConsumers) {
                if (consumer.durable_name) {
                    missingConsumers.set(consumer.durable_name, consumer);
                }
            }

            const consumers = await this.jetStreamContext.jsm.consumers.list(streamName).next();
            for (const consumer of consumers) {
                missingConsumers.delete(consumer.name);
            }
            for (const [name, consumer] of missingConsumers.entries()) {
                if (
                    this.#config.requiredConsumersConfigurationAction ===
                    PersistentConfigurationAction.DoNotTouch
                ) {
                    throw new Error(
                        `Required jetStream consumer with name '${name}' for stream is missing, but RequiredConsumersConfigurationAction is DoNotTouch.`,
                    );
                } else {
                    await this.jetStreamContext.jsm.consumers.add(streamName, consumer);
                }
            }
        }
    }

    /**
     * Publish publishes a message with the given payload on the given subject.
     *
     * The payload may be anything that can be encoded with the selected encoder.
     *
     * This method does not use JetStream, therefore no QOS is guaranteed.
     * For reliable messaging see PublishDurable
     *
     * Returns an error when encoding fails
     *
     * For more information on the behavior, parameters, and return value see nats.Conn.Publish
     * @param subject
     * @param payload
     * @returns
     */
    publish(subject: string, payload?: any): error {
        try {
            const bytes = payload ? this.encoder().encode(payload) : undefined;
            this.#natsContext.publish(subject, bytes);
        } catch (error) {
            return error;
        }
    }

    /**
     * Subscribe expresses interest in the specified subject. The subject may
     * have wildcards. Messages are delivered to the {@link SubOpts#callback |SubscriptionOptions callback}
     * if specified. Otherwise, the subscription is an async iterator for {Msg}.
     *
     * @param subject subject to subscribe
     * @param callbackFn handle Message
     */
    subscribe(subject: string, callbackFn: (msg: unknown) => void, opts?: SubscriptionOptions) {
        const sub = this.#natsContext.subscribe(subject, opts);
        (async () => {
            for await (const m of sub) {
                callbackFn(this.encoder().decode(m.data));
                m.respond();
            }
        })();
    }

    /**
     * Publishes a request with specified data in the specified subject expecting a
     * response before { RequestOptions#timeout } milliseconds. The api returns a
     * Promise that resolves when the first response to the request is received. If
     * there are no responders (a subscription) listening on the request subject,
     * the request will fail as soon as the server processes it.
     *
     * @param subject
     * @param data
     * @param opts
     */
    async request(subject: string, payload: any, timeout: number, opts?: RequestOptions) {
        const bytes = this.encoder().encode(payload);
        return await this.#natsContext.request(subject, bytes, { timeout, ...opts });
    }

    /**
     * Publishes a message to a stream. If not stream is configured to store the message, the
     * request will fail with {ErrorCode.NoResponders} error.
     *
     * @param subj - the subject for the message
     * @param data - the message's data
     * @param options - the optional message
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async publishDurable(subject: string, payload: any, options?: Partial<JetStreamPublishOptions>) {
        const bytes = this.encoder().encode(payload);
        return await this.jetStreamContext.jsc.publish(subject, bytes, options);
    }

    /**
     * Creates a push subscription. The JetStream server feeds messages to this subscription
     * without the client having to request them. The rate at which messages are provided can
     * be tuned by the consumer by specifying { ConsumerConfig#rate_limit_bps | ConsumerConfig.rate_limit_bps} and/or
     * {ConsumerOpts | maxAckPending}.
     *
     * It is recommended that a consumer be created first using JetStreamManager APIs and then
     * use the bind option to simply attach to the created consumer.
     *
     * If the filter subject is not specified in the options, the filter will be set to match
     * the specified subject.
     *
     * @param params - a subject used to locate the stream
     * @param opts
     */
    async pushSubscription(
        params: { subject: string; streamName: string; consumerName?: string; deliverSubject: string },
        callbackFn: (msg: unknown) => void,
        options?: Partial<ConsumerOpts> | ConsumerOptsBuilder,
    ) {
        const { subject, streamName, consumerName, deliverSubject } = params;
        const opts = consumerOpts();
        opts.deliverTo(deliverSubject);

        this.subscribe(deliverSubject, callbackFn);
        if (consumerName) {
            opts.bind(streamName, consumerName);
        }
        return this.jetStreamContext.jsc.subscribe(subject, { ...options, ...opts });
    }

    /**
     * Creates a pull subscription. A pull subscription relies on the client to request more
     * messages from the server. If the consumer doesn't exist, it will be created matching
     * the consumer options provided.
     *
     * It is recommended that a consumer be created first using JetStreamManager APIs and then
     * use the bind option to simply attach to the created consumer.
     *
     * If the filter subject is not specified in the options, the filter will be set to match
     * the specified subject.
     *
     * It is more efficient than {fetch} or {pull} because
     * a single subscription is used between invocations.
     *
     * @param subject - a subject used to locate the stream
     * @param opts
     */
    async pullSubscription(
        params: { subject: string; streamName: string; consumerName: string },
        callbackFn: (msg: unknown) => void,
    ) {
        const { subject, streamName, consumerName } = params;

        const opts = consumerOpts();
        opts.bind(streamName, consumerName);

        const sub = await this.jetStreamContext.jsc.pullSubscribe(subject, opts);
        (async () => {
            for await (const m of sub) {
                callbackFn(JSONCodec().decode(m.data));
            }
        })();

        return sub;
    }

    /**
     * Retrieves a single message from JetStream
     * @param stream - the name of the stream
     * @param consumer - the consumer's durable name (if durable) or name if ephemeral
     * @param expires - the number of milliseconds to wait for a message
     */
    pull(stream: string, consumer: string, expries?: number) {
        return this.jetStreamContext.jsc.pull(stream, consumer, expries);
    }

    /**
     * Similar to pull, but able to configure the number of messages, etc via PullOptions.
     * @param stream - the name of the stream
     * @param durable - the consumer's durable name (if durable) or name if ephemeral
     * @param opts
     */
    fetch(stream: string, consumer: string, opts?: Partial<PullOptions>) {
        return this.jetStreamContext.jsc.fetch(stream, consumer, opts);
    }

    /**
     * A builder API that creates a ConsumerOpt
     */
    defaultDurableSubOptions() {
        return consumerOpts();
    }

    /**
     * Connect actually connects this messaging connector instance to the messaging infrastructure.
     *
     * To customize the connection please call SetOptions.
     *
     * This message can only be called once per messaging connector.
     * Returns an error when called a second time.
     * @returns
     */
    async connect() {
        if (this.#connected) {
            throw new Error(`Cannot connect a MessagingConnection that is already connected.`);
        }

        const nc = await connect({
            servers: this.#config.serverURL,
            ...this.#options.additionalNatsOptions,
        });
        this.#natsContext = nc;

        const jsc = this.#natsContext.jetstream(this.#options.additionalJetStreamOptions);
        const jsm = await this.#natsContext.jetstreamManager(this.#options.additionalJetStreamOptions);

        this.jetStreamContext = { jsc, jsm };

        await this.configureRequiredStreams();
        await this.configureRequiredConsumers();

        this.#connected = true;
    }

    // Disconnect this messaging connector.
    // After this is called, there is no way to reconnect with this messaging connector.
    async disconnect() {
        await this.#natsContext.close();
        this.#connected = false;
        this.#disconnected = true;
    }

    async closed() {
        return this.#natsContext.closed();
    }
}
