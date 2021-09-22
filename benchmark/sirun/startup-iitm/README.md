Loads a sample ESM app, which quits right away after load. The app uses express
(which is implemented in CJS, as are most libraries), and simulates loading 100
local app files. The base case runs without an ESM hook, and the non-base case
runs with an iitm hook.
