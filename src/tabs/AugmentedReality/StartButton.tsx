import { useEffect } from 'react';
import type { ARState } from '../../bundles/ar/AR';
import { useScreenState } from 'saar/libraries/screen_state_library/ScreenStateContext';
import { ARButton } from '@react-three/xr';
import { Overlay } from './Overlay';
import { AugmentedLayer } from './AugmentedLayer';

/**
 * Toggle to start AR context, for tab.
 */
export function StartButton(props: ARState) {
  const screenState = useScreenState();

  useEffect(() => {
    screenState.setState(<AugmentedLayer {...props} />, <Overlay />);
  }, []);

  return (
    <div style={{ height: '50vh' }}>
      <ARButton
        enterOnly
        style={{}}
        sessionInit={{
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: screenState.domOverlay,
        }}
      />
      {screenState.component}
    </div>
  );
}
