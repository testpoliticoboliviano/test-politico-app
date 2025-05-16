// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  //cloudFunctionsUrl: 'http://127.0.0.1:4000/functions',
  cloudFunctionsUrl: 'https://us-central1-test-politico-app.cloudfunctions.net',
  firebase: {
    apiKey: "AIzaSyD-K7TXJcEJS6MQ5hM6s1n79_Jun1i1y4o",
    authDomain: "test-politico-app.firebaseapp.com",
    projectId: "test-politico-app",
    storageBucket: "test-politico-app.firebasestorage.app",
    messagingSenderId: "359856207340",
    appId: "1:359856207340:web:e2d592d5bd75d6259d3cc9",
    measurementId: "G-6P0FLC582N"
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
