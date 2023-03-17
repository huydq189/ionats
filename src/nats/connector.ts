import {
    ConsumerConfig,
    consumerOpts,
    JetStreamClient,
    JetStreamManager,
    JSONCodec,
    Msg,
    NatsConnection,
    StreamConfig,
    connect,
    StringCodec,
} from 'nats';
import { Config, PersistentConfigurationAction } from './config';
import { Options, OptionsBuilder } from './options';
import { error } from './types/options.type';

type JetStreamContext = {
    jsm: JetStreamManager;
    jsc: JetStreamClient;
};
// MsgCon is a messaging connector able to connect to the messaging infrastructure
// NewMessagingConnector creates a new messaging connector with the given config
// It does not yet actually connect to the messaging infrastructure.
// Use Connect for that.

export class MessagingConnector {
    private _config: Config;
    private _options: Options;
    private _connected: boolean;
    private _disconnected: boolean;
    private _natsContext: NatsConnection;
    private _jetStreamContext: JetStreamContext;

    private _encoder: typeof JSONCodec | typeof StringCodec;

    get config(): Config {
        return this._config;
    }

    set config(config: Config) {
        this._config = config;
    }

    get options(): Options {
        return this._options;
    }

    set options(options: Options) {
        this._options = options;
    }

    set connected(connected: boolean) {
        this._connected = connected;
    }

    get disconnected(): boolean {
        return this._disconnected;
    }

    set disconnected(disconnected: boolean) {
        this._disconnected = disconnected;
    }

    get natsContext(): NatsConnection {
        return this._natsContext;
    }

    set natsContext(nats: NatsConnection) {
        this._natsContext = nats;
    }

    get jetStreamContext(): JetStreamContext {
        return this._jetStreamContext;
    }

    set jetStreamContext(jetstreamContext: JetStreamContext) {
        this._jetStreamContext = jetstreamContext;
    }

    get encoder(): typeof JSONCodec | typeof StringCodec {
        return this.options.encoder;
    }

    constructor(config: Config) {
        this._config = config;
        this._connected = false;
        this._disconnected = false;
        this._natsContext = {} as any as NatsConnection;
        this._jetStreamContext = {} as any as JetStreamContext;
        this._options = new Options();
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
    setOptions(options: Options) {
        this.options = options;
    }

    static OptionsBuilder(): OptionsBuilder {
        return new OptionsBuilder();
    }

    async configureRequiredStreams(): Promise<error> {
        try {
            const missingStreams: Map<string, StreamConfig> = new Map();
            for (const stream of this.options.requiredStreams) {
                missingStreams.set(stream.name, stream);
            }

            const streamNames = await this.jetStreamContext.jsm.streams.names().next();
            for (const name of streamNames) {
                missingStreams.delete(name);
            }

            for (const [name, stream] of missingStreams) {
                if (
                    this.config.requiredStreamsConfigurationAction == PersistentConfigurationAction.DoNotTouch
                ) {
                    return new Error(
                        `Required jetStream stream ${name} is missing, but RequiredStreamsConfigurationAction is DoNotTouch.`,
                    );
                } else {
                    await this.jetStreamContext.jsm.streams.add(stream);
                }
            }

            for (const stream of this.options.requiredStreams) {
                if (
                    this.config.requiredStreamsConfigurationAction ===
                    PersistentConfigurationAction.AlwaysUpdate
                ) {
                    await this.jetStreamContext.jsm.streams.update(stream.name, stream);
                }
            }
        } catch (error) {
            return error;
        }
    }

    async configureRequiredConsumers(): Promise<error> {
        try {
            for (const [streamName, requiredConsumer] of this.options.requiredConsumers.entries()) {
                const missingConsumers: Map<string, ConsumerConfig> = new Map();
                if (requiredConsumer.durable_name) {
                    missingConsumers.set(requiredConsumer.durable_name, requiredConsumer);
                }
                const consumers = await this.jetStreamContext.jsm.consumers.list(streamName).next();
                for (const consumer of consumers) {
                    missingConsumers.delete(consumer.name);
                }
                for (const [name, consumer] of missingConsumers.entries()) {
                    if (
                        this.config.requiredConsumersConfigurationAction ===
                        PersistentConfigurationAction.DoNotTouch
                    ) {
                        return new Error(
                            `Required jetStream consumer ${name} for stream %s is missing, but RequiredConsumersConfigurationAction is DoNotTouch.`,
                        );
                    } else {
                        await this.jetStreamContext.jsm.consumers.add(streamName, consumer);
                    }
                }
            }
        } catch (error) {
            return error;
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
    publish(subject: string, payload: any): error {
        try {
            const bytes = this.encoder().encode(payload);
            this.natsContext.publish(subject, bytes);
        } catch (error) {
            return error;
        }
    }
    /*
     *Request will do a request with the given payload to the given subject and wait the given amount of time for the response.
     *
     *The payload may be anything that can be encoded with the selected encoder.
     *
     *This method does not use JetStream, therefore no QOS is guaranteed.
     *Request-reply is not supported by JetStream.
     *Reliability in request-reply can be archived by retrying the request on failure.
     *
     *Returns an error when encoding fails
     *
     *For more information on the behavior, parameters, and return value see nats.Conn.Request
     */
    async request(subject: string, payload: any, timeout: number): Promise<Msg | error> {
        try {
            const bytes = this.encoder().encode(payload);
            return await this.natsContext.request(subject, bytes, { timeout });
        } catch (error) {
            return error;
        }
    }
    /*
     * Publish publishes a message with the given payload on the given subject.
     *
     * The payload may be anything that can be encoded with the selected encoder.
     *
     * This method does use JetStream and the messages are therefore durable.
     * However you must make sure the Streams and Consumers are setup correctly.
     *
     * Returns an error when encoding fails
     *
     * For more information on the behavior, parameters, and return value see nats.JetStreamContext.Publish
     */
    publishDurable(subject: string, payload: any) {
        const bytes = this.encoder().encode(payload);
        return this.jetStreamContext.jsc.publish(subject, bytes);
    }
    /**
     * Subscribe subscribes to a subject, retrieving messages asynchronously.
     *
     * To decode the payload use MsgCon.Encoder.Decode
     *
     * This method does not use JetStream, therefore no QOS is guaranteed.
     * For reliable messaging see SubscribeDurableAsync
     *
     * For more information on the behavior, parameters, and return value see nats.Conn.Subscribe
     */
    subscribe(subject: string, handler: (msg: any) => void) {
        return this.natsContext.subscribe(subject, {
            callback: handler,
        });
    }

    /**
     * SubscribeDurable durably subscribes to a subject, retrieving messages asynchronously.
     * It uses the pre configured consumer with the given name on the stream with the given name.
     * The subject is defined by the configuration of the stream.
     *
     * To decode the payload use MsgCon.Encoder.Decode
     *
     * This method does use JetStream and the messages are therefore durable.
     * However you must make sure the Streams and Consumers are setup correctly.
     *
     * For more information on the behavior, parameters, and return value see nats.JetStreamContext.Subscriber
     */
    subscribeDurable(streamName: string, consumerName: string) {
        const opts = consumerOpts();
        opts.bind(streamName, consumerName);
        console.log(this.jetStreamContext);
        return this.jetStreamContext.jsc.subscribe('', opts);
    }

    // defaultDurableSubOptions returns some sensible default SubOpts for the JetStream Subscribe Functions
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
    async connect(): Promise<error> {
        if (this.connected) {
            return new Error(`Cannot connect a MessagingConnection that is already connected.`);
        }

        const nc = await connect({
            servers: this.config.serverURL,
            ...this.options.additionalNatsOptions,
        });
        this.natsContext = nc;

        const jsc = this.natsContext.jetstream(this.options.additionalJetStreamOptions);
        const jsm = await this.natsContext.jetstreamManager(this.options.additionalJetStreamOptions);

        this.jetStreamContext = { jsc, jsm };

        let err = await this.configureRequiredStreams();
        if (err) {
            return err;
        }

        err = this.configureRequiredConsumers();
        if (err) {
            return err;
        }

        this.connected = true;
    }

    // Disconnect this messaging connector.
    // After this is called, there is no way to reconnect with this messaging connector.
    async disconnect(): Promise<error> {
        try {
            await this.natsContext.close();
            this.connected = false;
            this.disconnected = true;
        } catch (error) {
            return error;
        }
    }
}
