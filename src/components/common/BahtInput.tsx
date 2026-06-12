'use client';

import { InputNumber } from 'antd';
import type { InputNumberProps } from 'antd';

import { formatBahtInputValue, parseBahtInputValue } from './baht-input-format';

/**
 * PR-31 cleanup — shared comma-grouped Baht amount input.
 *
 * Replaces the eight per-screen `InputNumber` formatter/parser copies.
 * Differences from those copies are deliberate:
 * - a cleared field parses to `null`, never 0, so optional amounts
 *   (e.g. land compensation) stay genuinely empty;
 * - garbage input parses to `null`, never NaN;
 * - negatives are allowed unless the caller passes `min={0}` (amendment
 *   deltas legitimately go negative).
 *
 * `formatter`/`parser` are owned here; everything else passes through.
 */
export type BahtInputProps = Omit<InputNumberProps<number>, 'formatter' | 'parser'>;

export function BahtInput({ style, ...rest }: BahtInputProps) {
  return (
    <InputNumber<number>
      style={{ width: '100%', ...style }}
      formatter={(value) => formatBahtInputValue(value)}
      parser={(text) =>
        // AntD's parser is typed `number | string` but treats null as
        // "cleared"; the cast is confined to this single wrapper.
        parseBahtInputValue(text) as unknown as number
      }
      {...rest}
    />
  );
}
