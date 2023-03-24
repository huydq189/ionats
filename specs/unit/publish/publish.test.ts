import { describe, test } from '@jest/globals';
import { RetentionPolicy, JSONCodec, AckPolicy } from 'nats';
import { Config, MessagingConnector, PersistentConfigurationAction } from '../../../src';

describe('publish message', () => {
    test('publish normal', async () => {
        const config: Config = {
            serverURL: ['nats://0.0.0.0:4222'],
            requiredStreamsConfigurationAction: PersistentConfigurationAction.CreateIfMissing,
            requiredConsumersConfigurationAction: PersistentConfigurationAction.CreateIfMissing,
        };
        const mc = new MessagingConnector(config);
        const options = mc
            .optionsBuilder()
            .setRequiredStreams([
                {
                    name: 'test',
                    retention: RetentionPolicy.Workqueue,
                },
            ])
            .setEncoder(JSONCodec);
        mc.setOptions(options);
        await mc.connect();

        // create a regular subscription - this is plain natsconsole.log(msg)
        const receiveMessagePromise = () =>
            new Promise((resolve, reject) => {
                mc.subscribe('xxx', (msg) => {
                    console.log('RECEIVE', msg);
                    resolve(msg);
                });
                mc.publish('xxx', 'test');
            });

        await expect(receiveMessagePromise()).resolves.not.toThrow();
    });
});
