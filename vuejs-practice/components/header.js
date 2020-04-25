const extracted_template = `
<nav class="navbar navbar-expand-sm navbar-dark">
    <div class="container">
    <a class="navbar-brand">WeblyTodo<img 
    v-bind:class="{'loading': true, 'loading-animate': updating}"
    src="img/loading.png"> <sub v-if="updating">Updating...</sub></a>
    
    <button class="navbar-toggler" data-toggle="collapse" data-target="#appLevelNav">
        <span class="navbar-toggler-icon"></span>
    </button>
</nav>
`;
export default Vue.component('page-header',{
    props: ['updating'],
    template: extracted_template,
})