import { Component } from 'react';
import ErrorPage from '../../pages/ErrorPage';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error in component tree:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage message={this.state.error?.message} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
