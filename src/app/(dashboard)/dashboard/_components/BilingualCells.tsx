'use client';

import { Tag, Typography } from 'antd';

const { Text } = Typography;

export function BilingualTextCell({
  th,
  en,
  secondary = false,
}: {
  th: string;
  en: string;
  secondary?: boolean;
}) {
  return (
    <div style={{ lineHeight: 1.25 }}>
      <div>{th}</div>
      <Text type={secondary ? 'secondary' : undefined} style={{ fontSize: 12 }}>
        {en}
      </Text>
    </div>
  );
}

export function BilingualTagCell({
  th,
  en,
  color,
}: {
  th: string;
  en: string;
  color: string;
}) {
  return (
    <Tag color={color} style={{ paddingBlock: 4, whiteSpace: 'normal', lineHeight: 1.2 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <span>{th}</span>
        <span style={{ fontSize: 11 }}>{en}</span>
      </div>
    </Tag>
  );
}
