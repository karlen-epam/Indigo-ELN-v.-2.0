'use strict';

angular.module('indigoeln')
    .config(function ($stateProvider) {
        $stateProvider
            .state('experiment', {
                parent: 'entity',
                url: '/experiment/{id}',
                views: {
                    'content@app_page': {
                        templateUrl: 'scripts/app/entities/experiment/detail/experiment-detail.html',
                        controller: 'ExperimentDetailController'
                    }
                },
                data: {
                    authorities: ['EXPERIMENT_READER', 'CONTENT_EDITOR'],
                    pageTitle: 'indigoeln'
                },
                resolve: {
                    data: ['$stateParams', 'Experiment', function($stateParams, Experiment) {
                        return Experiment.get({id : $stateParams.id}).$promise;
                    }]
                }
            })
            .state('newexperiment', {
                parent: 'entity',
                url: '/newexperiment',
                views: {
                    'content@app_page': {
                        templateUrl: 'scripts/app/entities/experiment/new/new-experiment.html',
                        controller: 'NewExperimentController'
                    }
                },
                params: {
                    experiment: {}
                },
                data: {
                    authorities: ['CONTENT_EDITOR', 'EXPERIMENT_CREATOR'],
                    pageTitle: 'indigoeln'
                },
                bindToController: true,
                resolve: {
                    experiment : function($stateParams) {
                        return $stateParams.experiment;
                    }
                }
            });
    });