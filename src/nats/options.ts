// options are the options that can be set for a messaging connector.
// For more info see setOptions
import {
    ConnectionOptions,
    ConsumerConfig,
    JetStreamOptions,
    StreamConfig,
    StringCodec,
    JSONCodec,
} from 'nats';

interface IOptions {
    setRequiredConsumers(requiredConsumers: Map<string, ConsumerConfig>): void;

    setRequiredStreams(requiredStreams: StreamConfig[]): void;

    setAdditionalJetStreamOptions(additionalJetStreamOptions: JetStreamOptions): void;
    setAdditionalNatsOptions(additionalNatsOptions: ConnectionOptions): void;
    setEncoder(encoder: typeof StringCodec | typeof JSONCodec): void;
}

interface IOptionsBuilder {
    reset(): void;
    setRequiredStreams(requiredStreams: StreamConfig[]): void;
    setRequiredConsumers(requiredConsumers: Map<string, ConsumerConfig>): void;
    setAdditionalNatsOptions(connectionOptions: ConnectionOptions): void;
    setAdditionalJetStreamOptions(jetStreamOptions: JetStreamOptions): void;
    setEncoder(encoder: typeof StringCodec | typeof JSONCodec): void;

    build(): Options;
}

export class Options implements IOptions {
    requiredStreams: StreamConfig[];
    requiredConsumers: Map<string, ConsumerConfig>;
    additionalNatsOptions: ConnectionOptions;
    additionalJetStreamOptions: JetStreamOptions;
    encoder: typeof StringCodec | typeof JSONCodec;

    constructor() {
        this.additionalJetStreamOptions = {};
        this.requiredConsumers = new Map();
        this.requiredStreams = [];
        this.additionalJetStreamOptions = {};
        this.additionalNatsOptions = {};
        this.encoder = JSONCodec;
    }

    setRequiredConsumers(requiredConsumers: Map<string, ConsumerConfig>): void {
        this.requiredConsumers = requiredConsumers;
    }

    setRequiredStreams(requiredStreams: StreamConfig[]): void {
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

    // Streams are part of JetStream, the protocol on top of NATS set durability guarantees.
    // Streams should be properly configured when using one of the durable publish or subscribe functions.
    setRequiredStreams(requiredStreams: StreamConfig[]) {
        this.options.setRequiredStreams(requiredStreams);
        return this;
    }

    // setRequiredConsumers returns the corresponding Option
    // indicating that consumers set the given config should be configured for the given stream
    // during Connect
    //
    // Consumers are part of JetStream, the protocol on top of NATS set durability guarantees.
    // Streams should be properly configured when using one of the durable subscribe functions.
    //
    // This will only overwrite the list of required consumers for the given stream name
    setRequiredConsumers(requiredConsumers: Map<string, ConsumerConfig>) {
        this.options.setRequiredConsumers(requiredConsumers);
        return this;
    }

    // setAdditionalNatsOptions returns the corresponding Option
    // for passing the given additional options to the nats.Connect call
    setAdditionalNatsOptions(additionalNatsOptions: ConnectionOptions) {
        this.options.setAdditionalNatsOptions(additionalNatsOptions);
        return this;
    }

    // setAdditionalJetStreamOptions returns the corresponding Option
    // for passing the given additional options the the nats.Conn.JetStream call
    setAdditionalJetStreamOptions(additionalJetStreamOptions: JetStreamOptions) {
        this.options.setAdditionalJetStreamOptions(additionalJetStreamOptions);
        return this;
    }
    // setEncoder returns the corresponding Option
    // for using the given encoder for encoding payloads
    setEncoder(encoder: typeof StringCodec | typeof JSONCodec) {
        this.options.setEncoder(encoder);
        return this;
    }

    build(): Options {
        return this.options;
    }
}
