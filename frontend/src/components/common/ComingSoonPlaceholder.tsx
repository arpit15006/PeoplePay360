import { Link } from 'react-router-dom';

interface ComingSoonProps {
  pageName?: string;
  routePath?: string;
}

export function ComingSoonPlaceholder({ pageName, routePath }: ComingSoonProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#475569',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '3rem 2.5rem',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      }}>
        <h2 style={{
          fontSize: '1.75rem',
          color: '#0f172a',
          marginBottom: '0.5rem',
          fontWeight: 700,
        }}>
          {pageName || 'Coming Soon'}
        </h2>
        {routePath && (
          <p style={{
            fontSize: '1rem',
            color: '#64748b',
            marginBottom: '1.5rem',
          }}>
            Path: <code>{routePath}</code>
          </p>
        )}
        <p style={{
          fontSize: '1.125rem',
          color: '#334155',
          marginBottom: '1.5rem',
        }}>
          Coming Soon
        </p>
        <Link
          to="/employees"
          style={{
            display: 'inline-block',
            backgroundColor: '#144f84',
            color: '#ffffff',
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          Back to Employees
        </Link>
      </div>
    </div>
  );
};

export default ComingSoonPlaceholder;
