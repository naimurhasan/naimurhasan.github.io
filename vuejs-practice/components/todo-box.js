const extracted_template = `
<div class="col p-3 height-match-parent-responsive bg-dark-blue">
    <!-- todo lits -->
    <h5>{{name ? name+"'s": ""}} Todos</h5>
    <ul class="list-group todo-lists">
        <li 
            v-for="todo in todos.slice().reverse()"
            v-bind:key="todo.id"
            v-bind:class="{'completed': todo.is_complete}"
            class="list-group-item text-dark-blue mb-2 d-flex align-items-center cursor-pointer">

            <input v-bind:checked="todo.is_complete" @change="$emit('mark-complete', todo.id)" type="checkbox" class="mr-2">
            
            <p class="mb-0">{{todo.title}}</p>
        </li>
    </ul>
    <!-- add todo input -->
    <div v-if="name" class="position-bottom-responsive">
        <form v-on:submit.prevent="addTodo">
            <div class="form-row">
                <div class="col">
                  <input v-model="title" type="text" class="form-control" placeholder="">
                </div>
                <div class="col-2 col-sm-5 col-md-4 col-lg-3 col-xl-1 text-right">
                  <input class="btn btn-info" type="submit" value="+">
                </div>
            </div>
        </form>
    </div>
</div>
`

export default Vue.component('todo-box', {
    props: ['todos', 'name'],
    template: extracted_template,
    data: function(){
        return {
            title: '',
        }
    },
    methods: {
        addTodo(){
            //Prevent Empty String
            this.title = this.title.trim();
            if(this.title == '') return
            
            
            //add if validated
            this.$emit('add-todo', this.title)
            this.title = ''
        },
    }
})