function Promise(executor) {
    this.__thens = [];

    var self = this;
    
    executor(
        function(value) {
             self.__resolve(value);
        },
        function(value) {
             self.__reject(value);
        }
    );
}

Promise.prototype = {
	then: function(onFulfilled, onRejected) {
        this.__thens.push({ resolve: onFulfilled, reject: onRejected });
 
        var self = this;
        
        return new Promise(function(resolve, reject) {
            self.__thens.push({ resolve: resolve, reject: reject });
        });
    },

	catch: function(onRejected) {
        this.__thens.push({ reject: onRejected });
        
        var self = this;
        
        return new Promise(function(resolve, reject) {
            self.__thens.push({ reject: reject });
        });
	},

    __resolve: function(value) {
        this.__complete('resolve', value);
    },
    
    __reject: function(value) {
        this.__complete('reject', value);
    },
    
	__complete: function(which, value) {
        this.then = (which === 'resolve') ?
                function(resolve, reject) { resolve && resolve(value); } :
                function(resolve, reject) { reject  && reject(value);  };
        
        this.resolve = this.reject = function () {
            throw new Error('Promise already completed.');
        };
        
        var then, i = 0;
        while (then = this.__thens[i++]) {
            then[which] && then[which](value);
        }
        
        delete this.__thens;
	}
};
