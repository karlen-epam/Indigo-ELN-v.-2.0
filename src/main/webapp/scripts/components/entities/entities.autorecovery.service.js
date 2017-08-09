angular
    .module('indigoeln')
    .factory('AutoRecoverEngine', autoRecoverEngine);

/* @ngInject */
function autoRecoverEngine(localStorageService, $timeout, EntitiesBrowser, Auth, Principal, $stateParams, $window) {
    var trackerDelay = 1000;
    var servfields = ['lastModifiedBy', 'lastVersion', 'version', 'lastEditDate', 'creationDate', 'templateContent'];
    var kinds = ['experiment', 'project', 'notebook'];
    var somethingUserChanged;
    var tracker = {
        change: function() {

        },
        changeDirty: function() {

        }
    };
    var states = {};
    var target;
    var subkey;
    var types;

    init();

    return {
        canUndo: canUndo,
        canRedo: canRedo,
        undoAction: undoAction,
        redoAction: redoAction,
        track: trackEntityChanges,
        clearRecovery: clearRecovery,
        tracker: tracker
    };

    function resolvePrincipal(func) {
        return Principal.identity()
            .then(func);
    }

    function init() {
        resolvePrincipal(function(user) {
            subkey = user.id + '.autorecover.';
            types = angular.fromJson(localStorageService.get(subkey));
            if (!types) {
                types = {};
                _.forEach(kinds, function(kind) {
                    types[kind] = {
                        recoveries: {}
                    };
                });
            }
        });

        angular.element($window)
            .on('mousedown keydown', function() {
                // user really change something
                somethingUserChanged = true;
            });
    }

    function getKey(kind, entity) {
        var id = getFullId(entity);

        return subkey + kind + '.entity.' + id;
    }

    function clear(kind, entity) {
        var curtab = EntitiesBrowser.getActiveTab();
        var id = getFullId(entity);
        var type = types[kind];
        var rec = type.recoveries[id];
        if (!rec) {
            return;
        }
        delete type.recoveries[id];
        localStorageService.remove(getKey(kind, entity));
        localStorageService.set(subkey, angular.toJson(types));
        delete curtab.tmpId;
        EntitiesBrowser.saveTabs();
    }

    function save(kind, entity) {
        var id = getFullId(entity);
        var clone = deleteServiceFields(angular.copy(entity));
        var type = types[kind];
        var rec = type.recoveries[id];
        if (!rec) {
            type.recoveries[id] = {
                id: id,
                name: entity.name,
                kind: kind
            };
            rec = type;
        }
        rec.date = +new Date();
        localStorageService.set(subkey, angular.toJson(types));
        localStorageService.set(getKey(kind, entity), angular.toJson(clone));
    }

    function getRecord(kind, entity) {
        var id = getFullId(entity);
        var type = types[kind];
        var rec = type.recoveries[id];
        if (!rec) {
            return;
        }

        return {
            entity: angular.fromJson(localStorageService.get(getKey(kind, entity))),
            rec: rec
        };
    }

    function deleteServiceFields(entity) {
        _.forEach(servfields, function(field) {
            delete entity[field];
        });

        return entity;
    }

    function getFullId(entity) {
        var curtab = EntitiesBrowser.getActiveTab();
        if (!entity) {
            return false;
        }

        return entity.fullId || curtab.tmpId;
    }

    function canUndo(entity) {
        var id = getFullId(entity);
        var state = states[id];
        if (!entity) {
            return false;
        }

        return state && state.actions.length > 0 && state.aindex >= 0;
    }

    function canRedo(entity) {
        var id = getFullId(entity);
        var state = states[id];
        if (!entity) {
            return false;
        }

        return state && state.actions.length > 0 && state.aindex < state.actions.length - 1;
    }

    function undoAction(entity) {
        var id = getFullId(entity);
        var act;
        var state = states[id];
        if (!entity) {
            return;
        }
        if (state && state.aindex >= 0) {
            act = state.actions[state.aindex];
            state.aindex -= 1;
            angular.extend(entity, act);
            entity.$$undo = true;
        }
    }

    function redoAction(entity) {
        var id = getFullId(entity);
        var state = states[id];
        var act;
        if (!entity) {
            return;
        }
        if (states && state.aindex < state.actions.length - 1) {
            act = (state.aindex < state.actions.length - 2) ? state.actions[state.aindex + 2] : state.last;
            state.aindex += 1;
            angular.extend(entity, act);
            entity.$$undo = true;
        }
    }

    function trackEntityChanges(args) {
        var entity = args.vm[args.kind];
        var fullId = getFullId(entity);
        var state = states[fullId] || {
                actions: []
            };
        var curtab = EntitiesBrowser.getActiveTab();
        target = args;
        if (!entity.id && !curtab.tmpId) {
            curtab.tmpId = +new Date();
            EntitiesBrowser.saveTabs();
        }
        states[fullId] = state;
        restore(entity, curtab);
        appendModelMethods();
        initTracker(state);
    }

    function restore(entity, curtab) {
        var rec = getRecord(target.kind, entity);
        var dirty = EntitiesBrowser.getActiveTab().dirty;
        if (rec && !dirty) {
            target.vm.restored = {
                rec: rec,
                resolve: function(val) {
                    if (val) {
                        angular.extend(entity, rec.entity);
                        setDirty();
                    }
                    clear(target.kind, entity);
                    target.vm.restored = null;
                }
            };
        } else if (rec && curtab.tmpId) {
            angular.extend(entity, rec.entity);
            setDirty();
        }
    }

    function setDirty() {
        EntitiesBrowser.changeDirtyTab($stateParams, true);
        target.onSetDirty();
    }

    function initTracker(state) {
        var ctimeout;
        var prev;
        var dirty = false;
        tracker.change = function(cur, old) {
            var entity = target.vm[target.kind];
            if (!somethingUserChanged) {
                return;
            }
            if (ctimeout) {
                $timeout.cancel(ctimeout);
            } else {
                prev = deleteServiceFields(angular.extend({}, old));
            }
            somethingUserChanged = false;
            ctimeout = $timeout(function() {
                EntitiesBrowser.changeDirtyTab($stateParams, dirty);
                if (dirty) {
                    save(target.kind, entity);
                    if (!entity.$$undo) {
                        if (state.aindex < state.actions.length - 1) {
                            state.actions = state.actions.slice(state.aindex);
                        }
                        state.actions.push(prev);
                        state.aindex = state.actions.length - 1;
                        state.last = angular.extend({}, entity);
                    }
                    Auth.prolong();
                }
                entity.$$undo = false;
                ctimeout = null;
            }, trackerDelay);
        };
        tracker.changeDirty = function(isDirty) {
            var entity = target.vm[target.kind];

            if (!isDirty && dirty) {
                clear(target.kind, entity);
                target.vm.restored = null;
            }
            dirty = isDirty;
        };
    }

    function appendModelMethods() {
        var vm = target.vm;
        var kind = target.kind;
        vm.undoAction = function() {
            undoAction(vm[kind]);
            setDirty();
        };
        vm.redoAction = function() {
            redoAction(vm[kind]);
            setDirty();
        };
        vm.canUndo = function() {
            return canUndo(vm[kind]);
        };
        vm.canRedo = function() {
            return canRedo(vm[kind]);
        };
    }

    function clearRecovery(_kind, entity) {
        resolvePrincipal(function() {
            clear(_kind, entity);
        });
    }
}
