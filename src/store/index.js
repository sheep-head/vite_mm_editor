import { createStore } from 'vuex'
import DataManager from '@/utils/DataManager'

const store = createStore({
    state: {
        mapInfos: null,
        actors: null,
        animations: null,
    },
    getters: {
        mapInfos(state) {
            return state.mapInfos;
        },
        actors(state) {
            return state.actors;
        },
    },
    mutations: {
        setWorkspaceData(state, payload) {
            state.mapInfos = payload.mapInfos;
            state.actors = payload.actors;
            state.animations = payload.animations;
        },
        increment(state) {
            state.count++
        }
    },
});

/** 在工作空间就绪后调用：重新从磁盘加载基础数据进 Vuex */
export function reloadStoreData(targetStore = store) {
    DataManager.clearCache();
    DataManager.init();
    targetStore.commit('setWorkspaceData', {
        mapInfos: DataManager.$loadDataSync('MapInfos', false, false),
        actors: DataManager.$loadDataSync('Actors', false, false),
        animations: DataManager.$loadDataSync('Animations', false, false),
    });
}

export default store
