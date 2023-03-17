import { AckPolicy, JSONCodec, RetentionPolicy } from 'nats';
import { Config, PersistentConfigurationAction } from './nats/config';
import { MessagingConnector } from './nats/connector';
import { OptionsBuilder } from './nats/options';
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
                name: 'mystream',
                retention: RetentionPolicy.Workqueue,
            },
        ])
        .setEncoder(JSONCodec)
        .setRequiredConsumers({
            mystream: [
                {
                    durable_name: 'Sample-Consumer',
                    ack_policy: AckPolicy.Explicit,
                },
            ],
        });
    mc.setOptions(options);
    await mc.connect();

    await mc.publishDurable('mystream.b', 'payload1'); //payload1 is a string

    // mc.publishDurable('subject2', 123); //payload2 is a number

    mc.publishDurable('mystream.b', {
        name: 'asd',
        whatever: 5,
    }); //payload3 is a dict
}

// Message không bị mất at least 1
async function main() {
    await publish();
}

main();
