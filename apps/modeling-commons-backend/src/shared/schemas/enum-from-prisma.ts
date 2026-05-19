import { Type, type TEnum } from 'typebox';

export const enumSchema = <T extends Record<string, string>>(e: T) => Type.Enum(e);
