import { countsByTopic, topicsByCategory } from '../../../build/site/queries';
import type { TopicOption } from '../../islands/Practice';
import { getSite } from '../../site';

/** 演習系アイランドに渡す分野・大分類の一覧（ビルド時に計算） */
export function practiceProps(): { topics: TopicOption[]; categories: { id: string; title: string }[] } {
  const { content } = getSite();
  const counts = countsByTopic(content);
  const groups = topicsByCategory(content);
  return {
    categories: groups.map((g) => ({ id: g.category.id, title: g.category.title })),
    topics: groups.flatMap((g) =>
      g.topics.map((t) => ({ id: t.id, title: t.title, category: t.category, problemCount: counts.get(t.id)?.problems ?? 0 })),
    ),
  };
}
