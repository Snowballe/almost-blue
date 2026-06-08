import React, {Component, ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {darkColors} from '../theme/colors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string | null;
}

/**
 * Captures les erreurs React non gérées pour éviter un crash total de l'app.
 * Sans cette barrière, n'importe quelle exception dans un composant enfant
 * ferait planter l'application entière (écran blanc natif).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(err: unknown): State {
    const message =
      err instanceof Error ? err.message : String(err ?? 'Erreur inconnue');
    return {hasError: true, error: message};
  }

  componentDidCatch(err: unknown, info: {componentStack: string}) {
    // En production, on brancherait ici un service de reporting (Sentry, etc.)
    console.error('[ErrorBoundary]', err, info.componentStack);
  }

  handleReset = () => {
    this.setState({hasError: false, error: null});
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Quelque chose s'est mal passé.</Text>
          {this.state.error ? (
            <Text style={styles.detail}>{this.state.error}</Text>
          ) : null}
          <TouchableOpacity style={styles.btn} onPress={this.handleReset}>
            <Text style={styles.btnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: darkColors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  detail: {
    color: darkColors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  btn: {
    backgroundColor: darkColors.accent,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  btnText: {
    color: darkColors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
