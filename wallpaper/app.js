import header from './components/slider-blast.js'
import category_listview from './components/category_listview.js'

const debug_mode = true;


let app = new Vue({
    el: '#app',
    
    data: {
        message: 'Hello, Vue'
    },
    
    created(){
        
    },    
    methods: {
        
    },
    
    computed: {
        
    },
    
    watch: {
        
    }
});

function log(obj){
    if (debug_mode == true) console.log(obj)
}

