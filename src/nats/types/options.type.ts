import { ConsumerConfig, StreamConfig } from 'nats';

// Error
export type error = Error | unknown | undefined;

export type StreamOption = Partial<StreamConfig> & { name: string };
export type StreamOptions = StreamOption[];
export type ConsumerOptions = { [streamName: string]: Partial<ConsumerConfig>[] };
