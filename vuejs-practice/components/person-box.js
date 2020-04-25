const extracted_template = `
<div id="appLevelNav" class="collapse navbar-collapse flex-column align-items-stretch col-sm-4 col-md-3 mb-5 mb-sm-0 mr-sm-2 p-3 height-match-parent-responsive bg-dark-blue">
    <!-- person lists -->
    <h5>Person</h5>
    <ul class="list-group person-list">
        <li 
            v-for="person in person_list"
            v-bind:key="person.id"
            @click.self="$emit('select-me', person.id)"
            :class="{'bg-warning': person.id == selected_id}"
            class="list-group-item mb-1 d-flex justify-content-between text-dark-blue ">
                {{person.name}}
            <span @click="deleteMe(person.id)" class="badge bg-danger text-white">x</span>
        </li>
    </ul>

    <!-- add a person -->
    <div class="position-bottom-responsive">
        <form v-on:submit.prevent="addPerson">
            <div class="form-row">
                <div class="col">
                  <input v-model="name" type="text" class="form-control" placeholder="">
                </div>
                <div class="col-2 col-sm-5 col-md-4 col-lg-3 col-xl-1 text-right">
                  <input class="btn btn-info" type="submit" value="+">
                </div>
            </div>
        </form>
    </div>

</div>
`

export default Vue.component('person-box',{
    props: ['person_list', 'selected_id'],
    template: extracted_template,
    data: function() {
        return {
            name: '',
        } 
    },
    methods: {
        addPerson(){
            //Prevent Empty String
            name = this.name.trim();
            if(name == '') return
            
            //add if validated
            this.$emit('add-person', name)
            this.name = ''
        },
        deleteMe(id){
            this.$emit('delete-person', id)
        }
    }
})