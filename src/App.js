import React, { Component } from 'react';
import PhotoGrid from './components/PhotoGrid';
import Hero from './components/Hero';
import { Snackbar } from 'react-mdl';

import Dropbox from 'dropbox';
import Unsplash from 'unsplash-js';
import './material.min';

import './css/vendor/material.min.css';
import './css/App.css';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      accessToken: "",
      searchTerm: "",
      searchKey: "",
      results: {},
      incomingResults: [],
      isLoading: false,
      isAuthenticated: false,
      snackbarParams: {
        active: false,
        message: "",
        timeout: 2750,
        action: ""
      }
    }

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.searchPhotos = this.searchPhotos.bind(this);
    this.setSearchPhotos = this.setSearchPhotos.bind(this);
    this.requestForMorePhotos = this.requestForMorePhotos.bind(this);
    this.saveToDropbox = this.saveToDropbox.bind(this);
    this.authenticateDropbox = this.authenticateDropbox.bind(this);
    this.handleShowSnackbar = this.handleShowSnackbar.bind(this);
    this.handleTimeoutSnackbar = this.handleTimeoutSnackbar.bind(this);
    this.handleSaveToDropbox = this.handleSaveToDropbox.bind(this);
  }

  handleShowSnackbar(message, action = "", timeout = 2750) {
    this.setState({
      snackbarParams: {
        active: true,
        message,
        timeout,
        action
      }
    });
  }

  handleTimeoutSnackbar() {
    const { snackbarParams } = this.state;
    this.setState({
      snackbarParams: {
        ...snackbarParams,
        active: false
      }
    });
  }

  componentWillMount() {
    const localStorageRef = localStorage.getItem(`stellar-dropbox-accessToken`);

    if (localStorageRef) {
      this.setState({
        accessToken: localStorageRef,
        isAuthenticated: true
      });
      return;
    }

    const urlParams = new URLSearchParams(window.location.hash);
    const accessToken = urlParams.get("#access_token");

    if (accessToken) {
      localStorage.setItem(`stellar-dropbox-accessToken`, accessToken);
      this.setState({
        accessToken,
        isAuthenticated: true
      });
    }

  }

  handleChange(event) {
    let { searchTerm } = this.state;
    searchTerm = event.target.value;
    this.setState({
      searchTerm
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    const { searchTerm } = this.state;

    this.setState({
      searchKey: searchTerm.toLowerCase(),
    }, () => {
      const { searchKey, results } = this.state;
      const page = (results[searchKey] && results[searchKey].page) ? results[searchKey].page : 1;
      this.searchPhotos(page);
    });
  }

  searchPhotos(page) {
    this.setState({ isLoading: true });

    const { searchKey, results } = this.state;

    if (results[searchKey] && results[searchKey].page === page) {
      this.setState({
        results: {
          ...results,
          [searchKey]: results[searchKey]
        },
        isLoading: false
      });
      return;
    }

    console.log(searchKey, page);

    const unsplash = new Unsplash({
      applicationId: "dd0e4c053fe4fa6e93c7cacc463fafe6c5eeaf5f4f6a2d794332a875e2df96b3",
      secret: "d22a4cac1f7f1c570a0ba09f7b60a8c95217f81906fbb26ab365380fa4a04dd6",
      callbackUrl: "urn:ietf:wg:oauth:2.0:oob"
    });

    unsplash.search.all(searchKey, page, 18)
    .then(response => response.json())
    .then(json => {
      console.log(json);
      this.setSearchPhotos(json.photos.results, page);
    });
  }

  setSearchPhotos (incomingResults, page) {
    const { results, searchKey } = this.state;
    const oldResults = (results[searchKey]) ? results[searchKey].hits : [];

    const updatedResults = [
      ...oldResults,
      ...incomingResults
    ];

    const areThereMoreResults = (incomingResults.length >= 18) ? true : false;

    console.log(updatedResults);

    this.setState({
      results: {
        ...results,
        [searchKey]: { hits: updatedResults, page, areThereMoreResults }
      },
      incomingResults,
      isLoading: false
    });

    if (incomingResults.length === 0) {
      this.handleShowSnackbar("No images match your search");
    }

  }

  requestForMorePhotos() {
    const { searchKey, results } = this.state;
    const page = (results[searchKey] && results[searchKey].page) ? results[searchKey].page + 1 : 1;
    this.searchPhotos(page);
  }

  handleSaveToDropbox(id, url) {
    const { isAuthenticated } = this.state;

    if (isAuthenticated) {
      this.saveToDropbox(id, url);
      return;
    }

    this.handleShowSnackbar("You need to Authenticate Dropbox", "Connect to Dropbox", 5000);
  }

  authenticateDropbox() {
    const key = "gscbxcjhou1jx21"
    window.open(`https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=token&redirect_uri=http://localhost:3000`, "_self");
  }

  saveToDropbox(id, url) {
    console.log(id, url);
    const { accessToken } = this.state;
    const dropbox = new Dropbox({ accessToken });

    dropbox.filesSaveUrl({ path: `/photo-${id}.jpg`, url: url })
    .then(response => this.handleShowSnackbar("Image saved to your Dropbox successfully"))
    .catch(error => this.handleShowSnackbar("Oops an error occured. Please check your internet connection"))

  }

  render() {
    const {
      searchTerm,
      searchKey,
      results,
      snackbarParams,
      isLoading
    } =  this.state;

    return (
      <div className="App">

        <Hero
          searchTerm={searchTerm}
          handleChange={this.handleChange}
          handleSubmit={this.handleSubmit}
        />

        <section>
          <div className="container">

            <Snackbar
              active={snackbarParams.active}
              onTimeout={this.handleTimeoutSnackbar}
              timeout={snackbarParams.timeout}
              action={snackbarParams.action}
              onActionClick={this.authenticateDropbox}
            >  {snackbarParams.message}
            </Snackbar>

            { (results[searchKey])
              ? <PhotoGrid
                photos={results[searchKey].hits}
                areThereMoreResults={results[searchKey].areThereMoreResults}
                handleSaveToDropbox={this.handleSaveToDropbox}
                requestForMorePhotos={this.requestForMorePhotos}
                isLoading={isLoading}
              />
              : ""
            }

          </div>
        </section>

      </div>
    );
  }
}

export default App;
