(function($, undefined){
  $.fn.toc = function(target) {
    var idCounter = 0;
    var existingIds = {};
    var createMenu = function(headings, level) {
      var root = $('<ul class="unstyled-list">');
      var getId = function(el) {
        var id = el.attr('id');

        if(!id) {
          id = 'toc' + (++idCounter);
        }

        if(typeof existingIds[id] !== 'undefined') {
          id = id + '-' + (++existingIds[id]);
        } else {
          existingIds[id] = 0;
        }

        el.attr('id', id);
        return id;
      };

      if(level === 2) {
        root.addClass('nav');
      }

      headings.each(function() {
        var id = getId($(this));
        var link = $('<a>').attr('href', '#' + id).html($(this).html());
        var current = $('<li>').html(link);
        var headings = $(this).nextUntil('h' + level).filter('h' + (level + 1));

        if(headings.length) {
          current.append(createMenu(headings, level + 1));
        }

        root.append(current);
      });

      return root;
    };


    this.append(createMenu($(target).find('h2'), 2));
  };

  $(document).ready(function() {
    $('#toc .normal').parent().toc('.page-content');

    $(window).on('resize', function(){
      $('[data-spy="scroll"]').each(function () {
        var $spy = $(this).scrollspy('refresh');
      });
    });

    if($(window).width() > 992) {
      $('#toc').affix({
        offset: {
          top: $('#toc').offset().top + 5
        }
      });
    }

    // This needs to be after #toc creation
    $('a[href^="#"]').click(function(ev) {
      var position = $(ev.target.hash).offset();

      if (position){
        $("html, body").animate({ scrollTop: position.top - offsetTop }, 300);
      }
    });

    $('#todo-example').todos('http://todos.feathersjs.com:80');
    $('body').scrollspy({
      target: '#toc',
      offset: 5
    });
  });
})(jQuery);
