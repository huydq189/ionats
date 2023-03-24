import { describe, test } from '@jest/globals';
import { RetentionPolicy, JSONCodec, AckPolicy } from 'nats';
import { Config, MessagingConnector, PersistentConfigurationAction } from '../../../src';

describe('create stream', () => {
    test('publish normal', async () => {
        const config: Config = {
            serverURL: ['nats://0.0.0.0:4222'],
            requiredStreamsConfigurationAction: PersistentConfigurationAction.CreateIfMissing,
            requiredConsumersConfigurationAction: PersistentConfigurationAction.CreateIfMissing,
        };
        const mc = new MessagingConnector(config);
        try {
            const options = mc
                .optionsBuilder()
                .setEncoder(JSONCodec)
                .setRequiredStreams([
                    {
                        name: 'testCreateStream',
                        subjects: ['testCreateStream.>'],
                        retention: RetentionPolicy.Workqueue,
                    },
                ])
                .setRequiredConsumers({
                    testCreateStream: [
                        {
                            name: 'testConsumerA',
                            ack_policy: AckPolicy.Explicit,
                        },
                        {
                            name: 'testConsumerB',
                            ack_policy: AckPolicy.Explicit,
                        },
                    ],
                });
            mc.setOptions(options);
            await mc.connect();

            mc.pushSubscription(
                {
                    streamName: 'testCreateStream',
                    subject: 'testCreateStream.testA',
                    deliverSubject: 'test',
                },
                (msg) => {
                    console.log(msg);
                    expect(msg).toBe('test');
                },
            );
            mc.publishDurable('testCreateStream.testA', 'test');
            await mc.closed();
        } catch (error) {
            // Remove all stream before
            const streams = await mc.jetStreamContext.jsm.streams.list().next();
            for (const stream of streams) {
                await mc.jetStreamContext.jsm.streams.delete(stream.config.name);
            }
            console.log(error);
        }
    });
});
