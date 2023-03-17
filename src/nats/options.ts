// options are the options that can be set for a messaging connector.
// For more info see setOptions
import { ConnectionOptions, JetStreamOptions, JSONCodec, StringCodec } from 'nats';
import { ConsumerOptions, StreamOptions } from './types/options.type';

interface IOptions {
    setRequiredStreams(requiredStreams: StreamOptions): void;
    setRequiredConsumers(requiredConsumers: ConsumerOptions): void;
    setAdditionalJetStreamOptions(additionalJetStreamOptions: JetStreamOptions): void;
    setAdditionalNatsOptions(additionalNatsOptions: ConnectionOptions): void;
    setEncoder(encoder: typeof StringCodec | typeof JSONCodec): void;
}

interface IOptionsBuilder {
    reset(): void;
    setRequiredStreams(requiredStreams: StreamOptions): void;
    setRequiredConsumers(requiredConsumers: ConsumerOptions): void;
    setAdditionalNatsOptions(connectionOptions: ConnectionOptions): void;
    setAdditionalJetStreamOptions(jetStreamOptions: JetStreamOptions): void;
    setEncoder(encoder: typeof StringCodec | typeof JSONCodec): void;

    build(): Options;
}

export class Options implements IOptions {
    requiredStreams: StreamOptions;
    requiredConsumers: ConsumerOptions;
    additionalNatsOptions: ConnectionOptions;
    additionalJetStreamOptions: JetStreamOptions;
    encoder: typeof StringCodec | typeof JSONCodec;

    constructor() {
        this.additionalJetStreamOptions = {};
        this.requiredConsumers = {};
        this.requiredStreams = [];
        this.additionalJetStreamOptions = {};
        this.additionalNatsOptions = {};
        this.encoder = JSONCodec;
    }

    setRequiredConsumers(requiredConsumers: ConsumerOptions): void {
        this.requiredConsumers = requiredConsumers;
    }

    setRequiredStreams(requiredStreams: StreamOptions): void {
        this.requiredStreams = requiredStreams;
    }

    setAdditionalJetStreamOptions(additionalJetStreamOptions: JetStreamOptions): void {
        this.additionalJetStreamOptions = additionalJetStreamOptions;
    }
    setAdditionalNatsOptions(additionalNatsOptions: ConnectionOptions): void {
        this.additionalNatsOptions = additionalNatsOptions;
    }
    setEncoder(encoder: typeof StringCodec | typeof JSONCodec): void {
        this.encoder = encoder;
    }
}

export class OptionsBuilder implements IOptionsBuilder {
    private options = new Options();

    reset() {
        this.options = new Options();
        return this;
    }

    /**
     * Streams are part of JetStream, the protocol on top of NATS set durability guarantees.
     * Streams should be properly configured when using one of the durable publish or subscribe functions.
     * @param requiredStreams
     * @returns
     */
    setRequiredStreams(requiredStreams: StreamOptions) {
        this.options.setRequiredStreams(requiredStreams);
        return this;
    }

    /**
     * setRequiredConsumers returns the corresponding Option
     * indicating that consumers set the given config should be configured for the given stream
     * during Connect
     *
     * Consumers are part of JetStream, the protocol on top of NATS set durability guarantees.
     * Streams should be properly configured when using one of the durable subscribe functions.
     *
     * This will only overwrite the list of required consumers for the given stream name
     * @param requiredConsumers
     * @returns
     */
    setRequiredConsumers(requiredConsumers: ConsumerOptions) {
        this.options.setRequiredConsumers(requiredConsumers);
        return this;
    }

    /**
     * setAdditionalNatsOptions returns the corresponding Option
     * for passing the given additional options to the nats.Connect call
     */
    setAdditionalNatsOptions(additionalNatsOptions: ConnectionOptions) {
        this.options.setAdditionalNatsOptions(additionalNatsOptions);
        return this;
    }

    /**
     * setAdditionalJetStreamOptions returns the corresponding Option
     * for passing the given additional options the the nats.Conn.JetStream call
     * @param additionalJetStreamOptions
     * @returns
     */
    setAdditionalJetStreamOptions(additionalJetStreamOptions: JetStreamOptions) {
        this.options.setAdditionalJetStreamOptions(additionalJetStreamOptions);
        return this;
    }
    /**
     * setEncoder returns the corresponding Option
     * for using the given encoder for encoding payloads
     * @param encoder
     * @returns
     */
    setEncoder(encoder: typeof StringCodec | typeof JSONCodec) {
        this.options.setEncoder(encoder);
        return this;
    }

    /**
     * @returns Options after set
     */
    build(): Options {
        return this.options;
    }
}
