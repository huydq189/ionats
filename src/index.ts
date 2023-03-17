import { Config, PersistentConfigurationAction } from './nats/config';
import { MessagingConnector } from './nats/connector';
import { Options } from './nats/options';
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
    mc.setOptions().;
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
    await mc.connect();

    let err = mc.publishDurable('subject1', 'payload1'); //payload1 is a string

    err = mc.publishDurable('subject2', 123); //payload2 is a number

    err = mc.publishDurable('subject3', {
        name: 'asd',
        whatever: 5,
    }); //payload3 is a dict
}

// Message không bị mất at least 1
async function main() {
    await subscribe();
    await publish();
}

main();
