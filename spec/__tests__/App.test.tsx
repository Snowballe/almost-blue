/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  // Démontage explicite pour déclencher les cleanup functions des hooks
  // (notamment clearTimeout dans useNotificationSetup) et éviter les open handles.
  await ReactTestRenderer.act(async () => {
    renderer.unmount();
  });
});
