import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, fetchAsUser } from '../api';
import type { User, ScheduledChore, UserStreakData, PointsData } from '../types';
import styles from './AmbientDashboard.module.css';
import { Flame } from 'lucide-react';
import { localDateStr } from '../utils';

interface KidData {
  user: User;
  pointsToday: number;
  totalBalance: number;
  streak: number;
}

export const AmbientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [kids, setKids] = useState<KidData[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const allUsers: User[] = await api.users.list();
      const childUsers = allUsers.filter(u => u.role === 'child' && !u.paused);
      const today = localDateStr(new Date());

      const results = await Promise.allSettled(
        childUsers.map(async (kid) => {
          const [chores, streakData, pointsData] = await Promise.all([
            fetchAsUser<ScheduledChore[]>(kid.id, `/users/${kid.id}/chores?view=daily&date=${today}`),
            fetchAsUser<UserStreakData>(kid.id, `/users/${kid.id}/streak`),
            fetchAsUser<PointsData>(kid.id, `/users/${kid.id}/points`),
          ]);

          const pointsToday = chores.filter(c => c.completed).reduce((sum, c) => sum + c.points_value, 0);

          return {
            user: kid,
            pointsToday,
            totalBalance: pointsData.balance,
            streak: streakData.current_streak,
          };
        })
      );

      setKids(results
        .filter((r): r is PromiseFulfilledResult<KidData> => r.status === 'fulfilled')
        .map(r => r.value)
      );
    } catch (err) {
      console.error('Ambient fetch error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 45000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Wake lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const request = async () => {
      try { wakeLock = await navigator.wakeLock.request('screen'); } catch { /* unsupported */ }
    };
    request();
    const onVisibility = () => { if (document.visibilityState === 'visible') request(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      wakeLock?.release();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (loading) return <div className={styles.container} />;

  const sorted = [...kids].sort((a, b) => a.user.name.localeCompare(b.user.name));

  return (
    <div className={styles.container} onClick={() => navigate('/login')}>
      <header className={styles.header}>
        <div className={styles.clock}>{timeStr}</div>
        <div className={styles.date}>{dateStr}</div>
      </header>

      <div className={styles.grid}>
        {sorted.map(kid => {
          return (
            <div key={kid.user.id} className={styles.card}>
              <div className={styles.avatarWrap}>
                <div className={styles.avatarInner}>
                  {kid.user.avatar_url
                    ? <img src={kid.user.avatar_url} alt={kid.user.name} className={styles.avatarImg} />
                    : <div className={styles.avatarPlaceholder} />}
                </div>
              </div>
              <h2 className={styles.name}>{kid.user.name}</h2>
              <div className={styles.statsRow}>
                {kid.streak > 0 && (
                  <span className={styles.streak}><Flame size={14} /> {t('ambient.streakDays', { count: kid.streak })}</span>
                )}
                <span className={styles.points}>{t('ambient.ptsToday', { count: kid.pointsToday })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
