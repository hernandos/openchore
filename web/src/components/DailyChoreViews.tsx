import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, CircleCheck, Clock, Lock, Rocket, Scroll, ShieldCheck, Coins, Sparkles, Swords, Telescope, TreePine, Sprout, Leaf, Star, Orbit } from 'lucide-react';
import clsx from 'clsx';
import type { ScheduledChore, ThemeConfig } from '../types';
import { groupChoresByTimePeriod, isTimePeriodActive, isTimePeriodPast } from '../timeGrouping';
import styles from '../pages/Dashboard.module.css';

const CATEGORY_ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  'shield-check': ShieldCheck,
  'circle-check': CircleCheck,
  'sparkles': Sparkles,
  'swords': Swords,
  'scroll': Scroll,
  'coins': Coins,
  'rocket': Rocket,
  'orbit': Orbit,
  'telescope': Telescope,
  'tree-pine': TreePine,
  'sprout': Sprout,
  'leaf': Leaf,
};

interface DailyChoreViewProps {
  chores: ScheduledChore[];
  config: ThemeConfig;
}

interface DailyListViewProps extends DailyChoreViewProps {
  renderChoreCard: (chore: ScheduledChore) => React.ReactNode;
}

interface DailyGridViewProps extends DailyChoreViewProps {
  today: string;
  togglingIds: Set<number>;
  onToggleComplete: (chore: ScheduledChore) => void;
}

type Category = ScheduledChore['category'];

const isLockedChore = (chore: ScheduledChore) => !chore.available && !chore.completed;

function groupChoresByCategory(chores: ScheduledChore[], config: ThemeConfig) {
  const categories: Category[] = ['required', 'core', 'bonus'];
  return categories
    .map(category => ({
      category,
      label: config.labels[category],
      chores: chores.filter(chore => chore.category === category),
    }))
    .filter(group => group.chores.length > 0);
}

const CategoryHeader: React.FC<{
  category: Category;
  label: string;
  chores: ScheduledChore[];
  config: ThemeConfig;
}> = ({ category, label, chores, config }) => {
  const Icon = CATEGORY_ICON_MAP[config.categoryIcons[category]];
  return (
    <div className={styles.categoryHeader}>
      {Icon
        ? <span className={styles[`catIcon_${category}`]}><Icon size={14} /></span>
        : <span className={clsx(styles.categoryDot, styles[`dot_${category}`])} />}
      <span className={styles.categoryLabel}>{label}</span>
      <span className={styles.categoryCount}>
        {chores.filter(chore => chore.completed).length}/{chores.length}
      </span>
    </div>
  );
};

export const DailyListView: React.FC<DailyListViewProps> = ({ chores, config, renderChoreCard }) => {
  const { t } = useTranslation();
  const timePeriods = groupChoresByTimePeriod(chores);

  return (
    <>
      {timePeriods.map(period => {
        const active = isTimePeriodActive(period.startHour, period.nextStartHour);
        const past = isTimePeriodPast(period.nextStartHour);
        const future = !active && !past;
        const available = period.chores.filter(chore => !isLockedChore(chore));
        const upcoming = period.chores.filter(isLockedChore);
        const categoryGroups = groupChoresByCategory(available, config);

        return (
          <div
            key={period.key}
            className={clsx(
              styles.timePeriodSection,
              active && styles.timePeriodActive,
              future && styles.timePeriodFuture,
              past && styles.timePeriodPast
            )}
          >
            <div className={styles.timePeriodHeader}>
              <div>
                <span className={styles.timePeriodEmoji}>{period.emoji}</span>
                <span className={styles.timePeriodLabel}>{period.label}</span>
                <span className={styles.timePeriodCount}>
                  {period.chores.filter(chore => chore.completed).length}/{period.chores.length}
                </span>
              </div>
            </div>

            <div className={styles.timePeriodBody}>
              {categoryGroups.map(group => (
                <div key={group.category} className={styles.categoryGroup}>
                  <CategoryHeader {...group} config={config} />
                  {group.chores.map(chore => renderChoreCard(chore))}
                </div>
              ))}

              {upcoming.length > 0 && (
                <div className={styles.categoryGroup}>
                  <div className={styles.sectionDivider}>
                    <span className={styles.dividerLine} />
                    <Clock size={14} className={styles.dividerIcon} />
                    <span className={styles.dividerText}>{t('dashboard.daily.comingUpLater')}</span>
                    <span className={styles.dividerLine} />
                  </div>
                  {upcoming.map(chore => renderChoreCard(chore))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

export const DailyGridView: React.FC<DailyGridViewProps> = ({ chores, config, today, togglingIds, onToggleComplete }) => {
  const { t } = useTranslation();
  const groups = groupChoresByCategory(chores.filter(chore => !isLockedChore(chore)), config);
  const upcoming = chores.filter(isLockedChore);

  return (
    <>
      {groups.map(group => (
        <div key={group.category} className={styles.categoryGroup}>
          <CategoryHeader {...group} config={config} />
          <div className={styles.kidsChoreGrid}>
            {group.chores.map(chore => {
              const isToday = chore.date === today;
              const isLocked = !chore.available && !chore.completed;
              const isToggling = togglingIds.has(chore.schedule_id);
              const canToggle = isToday && !isLocked && !isToggling;

              return (
                <button
                  key={`${chore.schedule_id}-${chore.date}`}
                  className={clsx(styles.card, chore.completed && styles.gridChoreCompleted)}
                  onClick={() => canToggle && onToggleComplete(chore)}
                  disabled={isLocked || chore.completed || isToggling}
                  style={{ opacity: isLocked || chore.completed ? 0.5 : 1, position: 'relative' }}
                >
                  <div className={clsx(styles.avatarWrapper, chore.completed && styles.completedAvatarWrapper)}>
                    {chore.icon ? (
                      <span style={{ fontSize: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px' }}>
                        {chore.icon}
                      </span>
                    ) : chore.completed ? (
                      <CheckCircle size={80} className={styles.placeholder} style={{ color: '#4ade80' }} />
                    ) : (
                      <CircleCheck size={80} className={styles.placeholder} />
                    )}
                    <div className={styles.lockBadge} style={!isLocked ? { backgroundColor: '#fbbf24', color: '#000', display: 'flex', alignItems: 'center', width: 'auto', padding: '0 6px', borderRadius: '12px' } : {}}>
                      {isLocked ? (
                        <Lock size={14} />
                      ) : (
                        <><Star size={10} style={{ marginRight: '2px' }} /> {chore.points_value}</>
                      )}
                    </div>
                  </div>
                  <span className={styles.name}>{chore.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {upcoming.length > 0 && (
        <div className={styles.categoryGroup}>
          <div className={styles.sectionDivider}>
            <span className={styles.dividerLine} />
            <Clock size={14} className={styles.dividerIcon} />
            <span className={styles.dividerText}>{t('dashboard.daily.comingUpLater')}</span>
            <span className={styles.dividerLine} />
          </div>
          <div className={styles.kidsChoreGrid}>
            {upcoming.map(chore => {
              return (
                <button
                  key={`${chore.schedule_id}-${chore.date}`}
                  className={styles.card}
                  disabled
                  style={{ opacity: 0.5, position: 'relative' }}
                >
                  <div className={styles.avatarWrapper}>
                    {chore.icon ? (
                      <span style={{ fontSize: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px' }}>
                        {chore.icon}
                      </span>
                    ) : (
                      <CircleCheck size={80} className={styles.placeholder} />
                    )}
                    <div className={styles.lockBadge}>
                      <Lock size={14} />
                    </div>
                  </div>
                  <span className={styles.name}>{chore.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
