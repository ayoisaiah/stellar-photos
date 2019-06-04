# Stellar Photos Server

[![Go Report Card](https://goreportcard.com/badge/github.com/ayoisaiah/stellar-photos-server)](https://goreportcard.com/report/github.com/ayoisaiah/stellar-photos-server)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/c4b6c69678d24b949aff772f124056f5)](https://www.codacy.com/app/ayoisaiah/stellar-photos-server?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ayoisaiah/stellar-photos-server&amp;utm_campaign=Badge_Grade)

The server code for [Stellar Photos](https://github.com/ayoisaiah/stellar-photos).

## Build instructions

As this project utilises [Go modules](https://blog.golang.org/using-go-modules), make sure you have Go v1.11+ installed on your computer.

- Clone the repo and `cd` into it.
- Sign up for the [Unsplash API](https://unsplash.com/documentation), [Dropbox API](https://www.dropbox.com/developers/documentation/http/overview), [OpenWeatherMap](https://openweathermap.org/api) and the [Onedrive API](https://docs.microsoft.com/en-us/onedrive/developer/rest-api/).
- Get your credentials from the respective services and enter them into a .env file in the root of the project. You can copy the provided `.env.example` file.
- Start the server on [http://localhost:8080](http://localhost:8080) by running `go build -o bin/server && ./bin/server`

## Contribute

Bug reports, feature requests or pull requests are much appreciated!

## Credits and Licence

- Powered by the [Unsplash API](https://unsplash.com/developers).
- Created by Ayooluwa Isaiah and released under the terms of the [MIT Licence](http://opensource.org/licenses/MIT).
