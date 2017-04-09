import React, { Component } from 'react';
import PhotoGrid from './components/PhotoGrid';
import Hero from './components/Hero';
import { Snackbar } from 'react-mdl';

import Dropbox from 'dropbox';
import Unsplash from 'unsplash-js';
import './material.min';

import './css/vendor/material.min.css';
import './css/App.css';

const dropbox = new Dropbox({ accessToken: "ZPFxi0wm_TAAAAAAAAAArYU2dgHlu1UIU3D40fSvlOBJZj5106iOn4cVT9Jce8zX"});

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
      isSnackbarActive: false,
      snackbarMsg: ""
    }

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.searchPhotos = this.searchPhotos.bind(this);
    this.setSearchPhotos = this.setSearchPhotos.bind(this);
    this.requestForMorePhotos = this.requestForMorePhotos.bind(this);
    this.saveToDropbox = this.saveToDropbox.bind(this);
    this.getDropboxAuthentication = this.getDropboxAuthentication.bind(this);
    this.handleShowSnackbar = this.handleShowSnackbar.bind(this);
    this.handleTimeoutSnackbar = this.handleTimeoutSnackbar.bind(this);
  }

  handleShowSnackbar(msg) {
    this.setState({
      isSnackbarActive: true,
      snackbarMsg: msg
    });
  }

  handleTimeoutSnackbar() {
    this.setState({ isSnackbarActive: false });
  }

  componentWillMount() {
    const localStorageRef = localStorage.getItem(`stellar-dropbox-accessToken`);

    if (localStorageRef) {
      this.setState({
        accessToken: localStorageRef
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

  getDropboxAuthentication () {

  }

  saveToDropbox(url) {
    const { dropbox } = this.props;
    dropbox.filesSaveUrl({ path: "/image.jpg", url: url })
    .then(response => console.log(response))
  }

  render() {
    const {
      searchTerm,
      searchKey,
      results,
      isSnackbarActive,
      snackbarMsg,
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
              active={isSnackbarActive}
              onTimeout={this.handleTimeoutSnackbar}
            >  {snackbarMsg}
            </Snackbar>

            { (results[searchKey])
              ? <PhotoGrid
                photos={results[searchKey].hits}
                areThereMoreResults={results[searchKey].areThereMoreResults}
                dropbox={dropbox}
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
