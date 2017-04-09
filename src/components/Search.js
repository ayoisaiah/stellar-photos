import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Grid, Cell } from 'react-mdl';

import '../css/Search.css';

class Search extends Component {

  render() {
    const { handleSubmit, handleChange, searchTerm } = this.props;
    return (
      <form onSubmit={handleSubmit} className="search-form">
        <Grid>
          <Cell col={9}>
            <input className="search-input" type="search" value={searchTerm} onChange={handleChange} />
          </Cell>
          <Cell col={3}>
            <button className="submit-button" type="submit">Search</button>
          </Cell>
        </Grid>
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
