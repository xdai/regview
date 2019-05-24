# RegGen: Register Accessor Generator

RegGen is a set of tools which help you to ease the pain of transcribing register definitions from datasheet to C/C++ code. It includes

- A GUI Transcriber running in your web browser to help transcribing the registers and exporting transcribed data in JSON format
- A set of command line tools to convert the JSON file to C/C++ code in different style

More documentation can be found on [confluence](<https://spdlybra.nintendo.co.jp/confluence/display/SIGLONGR/Register+Accessor+Generator>).

# GUI Transcriber

The GUI transcriber is a web app running in your web browser. A HTTP server is unnecessary. It was bootstrapped with [Create React App](https://github.com/facebook/create-react-app) and built based on [React](https://reactjs.org/) and [React-router](https://reacttraining.com/react-router/web/guides/quick-start).

[Node.js](https://nodejs.org/en/download/) is needed only if you want to develop (`npm start`) or build (`npm run build`) the tool. If you simply want to use the tool, then clone this repository, open the [index.html](https://spdlybra.nintendo.co.jp/bitbucket/projects/SIGLO/repos/reggen/browse/build/index.html) with web browser and you are all good to go.

## Available Scripts

In the project directory, you can run:

### `npm install`

Install all dependencies. <br>
You need to do this once in order to run all the other commands.

### `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>

# CLI Converter

*TODO: CLI Converter doesn't exist yet. Currently the converter is bundled in GUI transcriber. We will provide some implementation with C# / Python and update this readme.*