import { Component, type ErrorInfo, type ReactNode } from 'react';
import GlobalErrorFallback from './GlobalErrorFallback';
import { reportUnexpectedError } from './error-reporting';

interface Props { children: ReactNode; }
interface State { hasError: boolean; resetKey: number; }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, resetKey: 0 };
  static getDerivedStateFromError(): Partial<State> { return { hasError: true }; }
  componentDidCatch(error: Error, _info: ErrorInfo) { reportUnexpectedError(error); }
  private reset = () => this.setState(state => ({ hasError: false, resetKey: state.resetKey + 1 }));
  render() { return this.state.hasError ? <GlobalErrorFallback onRetry={this.reset} /> : <div key={this.state.resetKey}>{this.props.children}</div>; }
}
