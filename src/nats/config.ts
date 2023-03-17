import { error } from './types/options.type';

// PersistentConfigurationAction is a type indicating what to do with configuration options persisted in the nats infrastructure
export enum PersistentConfigurationAction {
    // Do not configure instances of this option ever
    DoNotTouch = 'DoNotTouch',
    // Create required instances of this option when they are not present but do not update existing instances
    CreateIfMissing = 'CreateIfMissing',
    // Always update the configuration of the required instances of this option
    AlwaysUpdate = 'AlwaysUpdate',
}

function isValid(a: PersistentConfigurationAction): boolean {
    switch (a) {
        case (PersistentConfigurationAction.DoNotTouch,
        PersistentConfigurationAction.CreateIfMissing,
        PersistentConfigurationAction.AlwaysUpdate):
            return true;
        default:
            return false;
    }
}

export function decode(value: PersistentConfigurationAction): error {
    if (!isValid(value)) {
        return new Error(`Invalid value for type PersistentConfigurationAction: ${value}'`);
    }
}

// Config is the configuration used by a messaging connector.
// These are intended to be set by the ops people deploying the application.
// For options set by the calling application see Options.
export type Config = {
    //default:"nats://127.0.0.1:4222" desc:"The url of the NATS server"`
    serverURL: string | string[];
    // default:"CreateIfMissing" desc:"What to do with for the required jetStream streams (DoNotTouch, CreateIfMissing, AlwaysUpdate)."
    requiredStreamsConfigurationAction: PersistentConfigurationAction;
    // default:"CreateIfMissing" desc:"What to do with for the required jetStream consumers (DoNotTouch, CreateIfMissing, AlwaysUpdate)."
    requiredConsumersConfigurationAction: PersistentConfigurationAction;
};
