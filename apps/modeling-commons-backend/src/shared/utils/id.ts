import { nanoid } from 'nanoid';
import { Type, type TString } from 'typebox';

export const ID_LENGTH = 21;
// drives ajv.addFormat('nanoid', ...);
// --Omar Ibrahim, Aug 12 26
export const ID_PATTERN = `^[A-Za-z0-9_-]{${ID_LENGTH}}$`;
export const ID_EXAMPLE = 'uAce-eANwFXi-tACAe9w1';
export const newId = (): string => nanoid(ID_LENGTH);
export const idSchema: (description?: string) => TString = (description?: string) => {
  return Type.String({
    format: 'nanoid',
    example: ID_EXAMPLE,
    description: description ?? "Entity's id",
  });
};
