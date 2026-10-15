import {
  IsIn,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const MAX_PASTE_CONTENT_LENGTH = 100_000;

export const PASTE_EXPIRATION_DURATIONS = ['10m', '1h', '1d', '7d'] as const;

export type PasteExpirationDuration =
  (typeof PASTE_EXPIRATION_DURATIONS)[number];

export const PASTE_VISIBILITIES = ['public', 'unlisted'] as const;

export type PasteVisibility = (typeof PASTE_VISIBILITIES)[number];

export class CreatePasteDto {
  @IsString()
  @Matches(/\S/, { message: 'content must contain non-whitespace text' })
  @MaxLength(MAX_PASTE_CONTENT_LENGTH, {
    message: `content must be at most ${MAX_PASTE_CONTENT_LENGTH} characters`,
  })
  content: string;

  // Omitted/undefined means no expiration; explicit null is rejected below.
  @ValidateIf((_o, value) => value !== undefined)
  @IsString()
  @IsIn([...PASTE_EXPIRATION_DURATIONS], {
    message: `expiresIn must be one of: ${PASTE_EXPIRATION_DURATIONS.join(', ')}`,
  })
  expiresIn?: PasteExpirationDuration;

  // Omitted/undefined defaults to 'public'; explicit null is rejected below.
  @ValidateIf((_o, value) => value !== undefined)
  @IsString()
  @IsIn([...PASTE_VISIBILITIES], {
    message: `visibility must be one of: ${PASTE_VISIBILITIES.join(', ')}`,
  })
  visibility?: PasteVisibility;
}
