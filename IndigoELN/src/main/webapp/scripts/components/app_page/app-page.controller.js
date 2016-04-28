/**
 * Created by Selector on 21.02.2016.
 */
'use strict';

angular
    .module('indigoeln')
    .controller('AppPageController', function ($rootScope, $scope, $cookieStore, $window, experimentStatusSubscriber, Config) {
        /**
         * Sidebar Toggle & Cookie Control
         */
        var mobileView = 992;

        $scope.getWidth = function () {
            return $window.innerWidth;
        };

        $scope.$watch($scope.getWidth, function (newValue) {
            if (newValue >= mobileView) {
                if (angular.isDefined($cookieStore.get('toggle'))) {
                    $scope.toggle = !$cookieStore.get('toggle') ? false : true;
                } else {
                    $scope.toggle = true;
                }
            } else {
                $scope.toggle = false;
            }

        });

        Config.load({}, function(config) {
            $rootScope.$broadcast('config-loaded', config);
        });

        $scope.toggleSidebar = function () {
            $scope.toggle = !$scope.toggle;
            $cookieStore.put('toggle', $scope.toggle);
        };

        $window.onresize = function () {
            $scope.$apply();
        };

        $scope.$on('$destroy', experimentStatusSubscriber.unSubscribe);

        //todo: refactoring
        experimentStatusSubscriber.onServerEvent(function (statuses) {
            $rootScope.$broadcast('experiment-status-changed', statuses);
        });

        $scope.onMouseWheel = function ($event) {
            var $this = $($event.currentTarget),
                scrollTop = $event.currentTarget.scrollTop,
                scrollHeight = $event.currentTarget.scrollHeight,
                height = $this.height(),
                delta = ($event.type === 'DOMMouseScroll' ?
                $event.originalEvent.detail * -40 :
                    $event.originalEvent.wheelDelta),
                up = delta > 0;

            var prevent = function () {
                $event.stopPropagation();
                $event.preventDefault();
                $event.returnValue = false;
                return false;
            };

            if (!up && -delta > scrollHeight - height - scrollTop) {
                // Scrolling down, but this will take us past the bottom.
                $this.scrollTop(scrollHeight);
                return prevent();
            } else if (up && delta > scrollTop) {
                // Scrolling up, but this will take us past the top.
                $this.scrollTop(0);
                return prevent();
            }
        };
    });