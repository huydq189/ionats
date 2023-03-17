import { AckPolicy, JSONCodec, RetentionPolicy } from 'nats';
import { Config, PersistentConfigurationAction } from './nats/config';
import { MessagingConnector } from './nats/connector';
import { Options, OptionsBuilder } from './nats/options';

type complexData = {
    name: string;
};
async function subscribe() {
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
                name: 'Sample-Stream',
                retention: RetentionPolicy.Workqueue,
            },
        ])
        .setEncoder(JSONCodec)
        .setRequiredConsumers({
            'Sample-Stream': [
                {
                    durable_name: 'Sample-Consumer',
                    ack_policy: AckPolicy.Explicit,
                },
            ],
        });
    mc.setOptions(options);
    await mc.connect();

    const sub = await mc.subscribeDurable('Sample-Stream', 'Sample-Consumer');
    (async () => {
        for await (const msg of sub) {
            console.log(`HUYDEBUG on subject ${msg.subject} data ${msg.data}`);
        }
    })();
}
async function publish() {
    const config: Config = {
        serverURL: ['nats://0.0.0.0:4222'],
        requiredStreamsConfigurationAction: PersistentConfigurationAction.CreateIfMissing,
        requiredConsumersConfigurationAction: PersistentConfigurationAction.CreateIfMissing,
    };
    const mc = new MessagingConnector(config);
    const options = new OptionsBuilder()
        .setRequiredStreams([
            {
                name: 'Sample-Stream',
                retention: RetentionPolicy.Workqueue,
            },
        ])
        .setEncoder(JSONCodec)
        .setRequiredConsumers({
            'Sample-Stream': [
                {
                    durable_name: 'Sample-Consumer',
                    ack_policy: AckPolicy.Explicit,
                },
            ],
        });
    mc.setOptions(options);
    await mc.connect();

    mc.publishDurable('', 'payload1'); //payload1 is a string

    // mc.publishDurable('subject2', 123); //payload2 is a number

    // mc.publishDurable('subject3', {
    //     name: 'asd',
    //     whatever: 5,
    // }); //payload3 is a dict
}

// Message không bị mất at least 1
async function main() {
    await subscribe();
    await publish();
}

main();
