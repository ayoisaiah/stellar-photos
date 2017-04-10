import React, { Component } from 'react';
import PropTypes from 'prop-types';

import '../css/Search.css';

class Search extends Component {

  render() {
    const { handleSubmit, handleChange, searchTerm } = this.props;
    return (
      <form onSubmit={handleSubmit} className="search-form">
        <input className="search-input" type="search" value={searchTerm} onChange={handleChange} />
        <button className="submit-button" type="submit">Search</button>
      </form>
    );
  }

}

Search.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired
}

export default Search;
