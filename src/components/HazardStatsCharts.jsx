import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import './HazardStatsCharts.css';

const CHART_COLORS = { open: '#dc9a28', closed: '#2c8558' };

const STATUS_ORDER = ['חדש', 'אומת', 'בטיפול', 'נסגר'];
const STATUS_LABEL = {
  'חדש': 'דווח',
  'אומת': 'אומת בשטח',
  'בטיפול': 'בטיפול',
  'נסגר': 'טופל וסגור',
};

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('he-IL', {
    month: 'short',
    year: '2-digit',
  });
}

export default function HazardStatsCharts({ stats }) {
  if (!stats) return null;

  const maxStatusCount = Math.max(1, ...STATUS_ORDER.map((s) => stats.byStatus[s] || 0));
  const maxCategoryCount = stats.byCategory?.length ? Math.max(...stats.byCategory.map((c) => c.count)) : 1;

  return (
    <>
      <div className="stats-block__headline">
        <div className="stats-block__stat">
          <span className="stats-block__stat-number">{stats.totalReports}</span>
          <span className="stats-block__stat-label">דיווחי מפגעים בסך הכל</span>
        </div>
        <div className="stats-block__stat">
          <span className="stats-block__stat-number">{stats.resolvedPercent}%</span>
          <span className="stats-block__stat-label">מהדיווחים טופלו וסגורים</span>
        </div>
      </div>

      <section className="stats-block__section">
        <h2>סטטוס הדיווחים</h2>
        <div className="stats-block__bars">
          {STATUS_ORDER.map((s) => {
            const count = stats.byStatus[s] || 0;
            const pct = Math.round((count / maxStatusCount) * 100);
            return (
              <div key={s} className="stats-block__bar-row">
                <span className="stats-block__bar-label">{STATUS_LABEL[s]}</span>
                <div className="stats-block__bar-track">
                  <div className="stats-block__bar-fill" data-status={s} style={{ width: `${pct}%` }} />
                </div>
                <span className="stats-block__bar-count">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {stats.byCategory.length > 0 && (
        <section className="stats-block__section">
          <h2>דיווחים לפי קטגוריה</h2>
          <div className="stats-block__bars">
            {stats.byCategory.map((c) => {
              const pct = Math.round((c.count / maxCategoryCount) * 100);
              return (
                <div key={c.name} className="stats-block__bar-row">
                  <span className="stats-block__bar-label">{c.name}</span>
                  <div className="stats-block__bar-track">
                    <div className="stats-block__bar-fill stats-block__bar-fill--category" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="stats-block__bar-count">{c.count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {stats.byReportType && (
        <section className="stats-block__section">
          <h2>מי מדווח</h2>
          <div className="stats-block__headline stats-block__headline--secondary">
            <div className="stats-block__stat">
              <span className="stats-block__stat-number">{stats.byReportType['מזוהה'] || 0}</span>
              <span className="stats-block__stat-label">דיווחי תושב מזוהה</span>
            </div>
            <div className="stats-block__stat">
              <span className="stats-block__stat-number">{stats.byReportType['אנונימי'] || 0}</span>
              <span className="stats-block__stat-label">דיווחים אנונימיים</span>
            </div>
          </div>
        </section>
      )}

      {stats.byMonth?.length > 0 && (
        <section className="stats-block__section">
          <h2>מגמת דיווחים לפי חודש</h2>
          <p className="stats-block__chart-note">
            לפי חודש הדיווח המקורי; "טופלו" מציג כמה מדיווחי אותו חודש כבר סגורים היום.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.byMonth} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelFormatter={formatMonthLabel} />
              <Line type="monotone" dataKey="total" name="דווחו" stroke={CHART_COLORS.open} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="closed" name="טופלו" stroke={CHART_COLORS.closed} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {stats.leadingIssues?.length > 0 && (
        <section className="stats-block__section">
          <h2>הבעיות המובילות</h2>
          <div style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height={Math.max(180, stats.leadingIssues.length * 34)}>
              <BarChart
                data={stats.leadingIssues}
                layout="vertical"
                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="subcategory"
                  width={140}
                  tickMargin={20}
                  tick={{ fontSize: 11, fill: '#1a1a1a' }}
                />
                <Tooltip />
                <Bar dataKey="open" name="פתוח" stackId="a" fill={CHART_COLORS.open} />
                <Bar dataKey="closed" name="טופל" stackId="a" fill={CHART_COLORS.closed} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </>
  );
}
