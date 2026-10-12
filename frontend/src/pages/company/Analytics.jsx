import { useEffect, useState } from 'react';
import { api } from '../../services/api';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

export default function Analytics() {
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get('/company/analytics')
      .then(res => setD(res.data))
      .catch(err => console.error('Analytics error:', err));
  }, []);

  if (!d) {
    return (
      <div className="analytics-wrapper">
        <div className="analytics-loading">
          Loading analytics...
        </div>
      </div>
    );
  }

  const pieData = (d.topJobs || []).map(job => ({
    name: job.title,
    value: Number(job.applications || 0)
  }));

  const COLORS = [
    '#4F46E5',
    '#06B6D4',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6'
  ];

  return (
    <div className="analytics-wrapper">

      {/* PAGE HEADER */}
      <div className="analytics-header">
        <div>
          <span className="analytics-eyebrow">
            RECRUITMENT INSIGHTS
          </span>

          <h1>Recruiting Analytics</h1>

          <p>
            Track your job postings, applications and recruitment
            performance from one place.
          </p>
        </div>
      </div>


      {/* STATISTICS */}
      <div className="analytics-stats">

        <div className="analytics-card">
          <div className="analytics-icon jobs-icon">
            💼
          </div>

          <div>
            <span>Total Jobs</span>
            <strong>{d.totalJobs || 0}</strong>
          </div>
        </div>


        <div className="analytics-card">
          <div className="analytics-icon application-icon">
            📩
          </div>

          <div>
            <span>Applications</span>
            <strong>{d.totalApplications || 0}</strong>
          </div>
        </div>


        <div className="analytics-card">
          <div className="analytics-icon views-icon">
            👁
          </div>

          <div>
            <span>Total Views</span>
            <strong>{d.totalViews || 0}</strong>
          </div>
        </div>


        <div className="analytics-card">
          <div className="analytics-icon average-icon">
            📈
          </div>

          <div>
            <span>Avg. Applications</span>
            <strong>
              {d.averageApplicationsPerPost || 0}
            </strong>
          </div>
        </div>

      </div>


      {/* CHARTS */}
      <div className="analytics-grid">

        {/* PIE CHART */}
        <div className="analytics-chart">

          <div className="chart-header">
            <div>
              <h2>Applications Distribution</h2>
              <p>
                Applications received for each job posting
              </p>
            </div>
          </div>

          {pieData.length > 0 ? (

            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height={350}
              >
                <PieChart>

                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={75}
                    outerRadius={120}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ percent }) =>
                      `${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >

                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          COLORS[index % COLORS.length]
                        }
                      />
                    ))}

                  </Pie>

                  <Tooltip />

                  <Legend
                    verticalAlign="bottom"
                    height={45}
                  />

                </PieChart>
              </ResponsiveContainer>

            </div>

          ) : (

            <div className="empty-chart">
              No application data available
            </div>

          )}

        </div>


        {/* BAR CHART */}
        <div className="analytics-chart">

          <div className="chart-header">
            <div>
              <h2>Top Performing Jobs</h2>
              <p>
                Jobs receiving the highest number of applications
              </p>
            </div>
          </div>

          {pieData.length > 0 ? (

            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height={350}
              >

                <BarChart
                  data={pieData}
                  margin={{
                    top: 20,
                    right: 25,
                    left: 5,
                    bottom: 70
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={70}
                  />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="value"
                    name="Applications"
                    fill="#4F46E5"
                    radius={[7, 7, 0, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          ) : (

            <div className="empty-chart">
              No job data available
            </div>

          )}

        </div>

      </div>


      {/* RECRUITMENT SUMMARY */}
      <div className="analytics-summary">

        <div className="summary-header">
          <span>RECRUITMENT OVERVIEW</span>

          <h2>
            Your hiring activity
          </h2>
        </div>


        <div className="summary-items">

          <div className="summary-item">
            <strong>
              {d.totalJobs || 0}
            </strong>

            <span>
              Active Job Posts
            </span>
          </div>


          <div className="summary-item">
            <strong>
              {d.totalApplications || 0}
            </strong>

            <span>
              Candidates Applied
            </span>
          </div>


          <div className="summary-item">
            <strong>
              {d.totalViews || 0}
            </strong>

            <span>
              Job Views
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}