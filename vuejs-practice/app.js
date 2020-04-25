import page_header from './components/header.js'
import personbox from './components/person-box.js'
import todobox from './components/todo-box.js'
const api_uri = 'https://extendsclass.com/api/json-storage/bin/caacefa'
const debug_mode = true;

const axinstance = axios.create({
    baseURL: 'https://api.jsonbin.io/',
    timeout: 15000,
    headers: {
        'secret-key': '$2b$10$FnVaUyGEbS/x/jFK8e8wFOogt.wvwMsYixwvH2A5deN4nATh6.T1S',
        'Content-Type': 'application/json',
        'versioning': false
    }
})

let app = new Vue({
    el: '#app',
    
    data: {
        message: 'Hello, Vue',
        updating: false,
        sync_count: 0,
        data_updatting: true,
        increment: 0, //specially used for id
        selected_person_id: 1,
        person_list: [
            {id:1, name: 'Loading...'},
        ],
        todo_list: [
            {}
        ]
    },
    
    
    created(){
        
        this.debouncedUpdate = _.debounce(this.updateServer, 1000)
        
        console.log('%c Server is upto date! ', 'background: #222; color: #bada55');
            axinstance.get(
                "/b/5e932f08f6e7a342d9637b10"
            ).then(res => {
                console.log(res.data)
                this.increment = res.data.increment
                this.selected_person_id = res.data.selected_person_id
                this.person_list = res.data.person_list
                this.todo_list = res.data.todo_list
            }).catch(err => {
                console.log(err)
                alert('Something went wrong!\nPlease realod\nor check console logs, or.')
            }) 
        
    },    
    methods: {
        selectPerson(id){
            this.selected_person_id = id
        },
        addThePerson(the_name){
            log("INPUTTED NAME "+the_name)
            log("Increment "+this.increment)
            
            const person = {id: this.increment, name: the_name}
            const todo_list = {person_id: this.increment, todo: []}
            
            
            log(person)
            this.person_list.push(person)
            this.todo_list.push(todo_list)
            this.increment++;
            this.sync_count++
        },
        deletePerson(id){
            log('DELETE '+id)
            this.todo_list = this.todo_list.filter(todo => todo.person_id != id)
            this.person_list = this.person_list.filter(person => person.id != id)
            if(id == this.selected_person_id){
                log("THERE IS A PROBLEM TO DELETE")
                if(this.person_list.length)
                    this.selected_person_id = this.person_list[0].id
                else
                    this.selected_person_id = 0
            }
            this.sync_count++
        },
        addTodo(title){
            log('ADDING TODO: '+title)             
            this.selected_persons_todo.push({id: this.increment++, title: title, is_complete: false})
            this.sync_count++
            
        },
        markComplete(todo_id){
            const todo = this.selected_persons_todo.find(t => t.id == todo_id)
            todo.is_complete = !todo.is_complete
            this.sync_count++
            
        },
        updateServer(){
            //to spin the loading 
            this.updating = true
            log(this.updating)
            
            console.log('%c Server is upto date! ', 'background: #222; color: #bada55');
            axinstance.put(
                "/b/5e932f08f6e7a342d9637b10",{
                    increment: this.increment,
                    selected_person_id: this.selected_person_id,
                    person_list: this.person_list,
                    todo_list: this.todo_list                    
                }
            ).then(res => {
                this.updating = false
                console.log(res.data)
            }).catch(err => {
                this.updating = false
                alert('Could not update.\nSomething went wrong.')
                console.log(err)
            }) 
        
        }  
       
        
    },
    
    computed: {
        selected_persons_todo(){
            log("Showing Todo For Selected Person")
            let todo_table;
            todo_table = this.todo_list.find(todo => todo.person_id == this.selected_person_id)
            
            if(todo_table == undefined){
                return []
            }
            
            return todo_table.todo
        },
        selected_peson_name(){
            const person = this.person_list.find(p => p.id == this.selected_person_id)
            
            if(person == undefined) return null
            
            return person.name
        }
    },
    
    watch: {
        sync_count: function(){
            this.debouncedUpdate() 
        }
        
    }
    
    
});

function log(obj){
    if (debug_mode == true) console.log(obj)
}

