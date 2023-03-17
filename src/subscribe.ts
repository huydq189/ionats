import { AckPolicy, JSONCodec, RetentionPolicy } from 'nats';
import { Config, PersistentConfigurationAction } from './nats/config';
import { MessagingConnector } from './nats/connector';
import { Options, OptionsBuilder } from './nats/options';

type complexData = {
    name: string;
};
let done: Promise<void>;
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
                name: 'mystream',
                retention: RetentionPolicy.Workqueue,
                subjects: ['mystream.>'],
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

    // create a regular subscription - this is plain nats
    const sub = mc.natsContext.subscribe('mystream.b');
    mc.jetStreamContext.jsc.pullSubscribe(subject, opts)
    done = (async () => {
        for await (const m of sub) {
            console.log(mc.encoder().decode(m.data));
        }
    })();
}

// Message không bị mất at least 1
async function main() {
    await subscribe();
    await done;
}

main();
