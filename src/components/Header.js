import React, { Component } from 'react';
import Search from './Search';

import "../css/Header.css";

class Header extends Component {
  render() {
    const { searchTerm, handleChange, handleSubmit } = this.props;
    return (

      <header className="header">

        <div className="header-content">
          <div className="title">
            <h1><a href="https://ayoisaiah.com/stellar-photos">Stellar Photos</a></h1>
          </div>
          <Search
            searchTerm={searchTerm}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
          />
          <nav className="links">
            <a href="https://github.com/ayoisaiah/stellar-photos">View on Github</a>
          </nav>
        </div>


      </header>



    )
  }
}

export default Header;
