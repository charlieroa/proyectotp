import React from 'react';
import { Toaster } from 'sileo';

// i18n initialization
import './i18n';

//import Scss
import './assets/scss/themes.scss';

//imoprt Route
import Route from './Routes';

// Fackbackend
import fakeBackend from './helpers/AuthType/fakeBackend';

// Activating fake backend
fakeBackend();

function App() {
  return (
    <React.Fragment>
      <Toaster position="bottom-right" offset={{ bottom: 16, right: 16 }} theme="light" options={{ fill: "#111111" }} />
      <Route />
    </React.Fragment>
  );
}

export default App;
