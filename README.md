# Indigo ELN

## Build dependencies

- Java 1.8
- Maven 3.1
- GIT

## Profiles

IndigoEln comes with two Spring "profiles":

- "dev" for development: it focuses on ease of development and productivity
- "release" for production: it focuses on performance and scalability
Those profiles come in two different configurations:

The Maven profiles are used at build time. For example mvn -Prelease package will package a production application.
The Spring profiles work at run time. Some Spring beans will behave differently, depending on the profile.
Spring profiles are set by Maven, so we have a consistency between the two methods:you will have a "release" profile on Maven and Spring at the same time.

### In default mode, IndigoEln will use the "dev" profile

If you run the application without Maven, launch the "Application" class (you can probably run it easily from your IDE by right-clicking on it).

If you run the application with Maven, run mvn

### In production, IndigoEln has to run with the "release" profile
Use Maven to build the application with the "release" profile: mvn -Prelease

When you run the application, don't forget to add the "release" profile, by adding --spring.profiles.active=release to program arguments.

You can test it with Maven, by running mvn -Prelease

## Project Structure
IndigoEln client code can be found under src/main/webapp/scripts, it is structured similarly to projects generated by angular-fullstack
```
webapp
├── index.html                        - Application starting page that loads everything
├── bower_components                  - Dependencies retrieved by bower
├── assets
│   ├── fonts                         - Fonts
│   ├── images                        - Images
│   ├── styles                        - CSS stylesheets
├── scripts
│   ├── app                           - App specific components go in here
│   │   ├── app.js                    - Main script
│   │   ├── app.constants.js          - Constants generated by build
│   │   ├── main
│   │   │   ├── main.js               - Component's definition like a state/route
│   │   │   ├── main.controller.js    - Component's controller
│   │   │   ├── main.html             - Component's view
│   │   │
│   ├── components                    - Our reusable components, non-specific to our app
│   │   ├── navbar
│   │   │   ├── navbar.js
│   │   │   ├── navbar.controller.js  
│   │   │   ├── navbar.directive.js
│   │   │   ├── navbar.html
│   │   ├── util                      - Generic components like filters to format data
```