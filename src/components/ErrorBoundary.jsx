import React from 'react';

/** Catches render crashes so the shell does not go fully white. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary:${this.props.label || 'view'}]`, error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card p-6 m-4 max-w-lg" role="alert">
          <h2 className="text-sm font-bold m-0" style={{ color: 'var(--danger)' }}>
            Something broke in {this.props.label || 'this view'}
          </h2>
          <p className="text-[12px] mt-2 m-0" style={{ color: 'var(--muted)' }}>
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button
            type="button"
            className="btn-primary mt-4 px-3 py-2 text-[12px]"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
