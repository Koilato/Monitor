import type { RefObject } from 'react';
import { useLatestContent } from 'content/hooks/useLatestContent';
import { LatestFeedPanel } from 'content/components/LatestFeedPanel';

interface LatestFeedSectionProps {
  sectionRef: RefObject<HTMLElement | null>;
  height: number;
  category: string;
  limit: number;
}

export function LatestFeedSection(props: LatestFeedSectionProps) {
  const { sectionRef, height, category, limit } = props;
  const { data, loading, error } = useLatestContent(category, limit);

  return (
    <section
      className="latest-section"
      ref={sectionRef}
      style={{ flexBasis: `${height}px` }}
    >
      <LatestFeedPanel
        data={data}
        loading={loading}
        error={error}
      />
    </section>
  );
}
