# Graph
# Controller to create graphviz graphics

class GraphController < ApplicationController

  before_filter :get_model_from_id_param

  def graphviz
    stem = "graphviz_#{Time.now.to_i}"
    format = 'png'
    filename = "/tmp/#{stem}.#{format}"

    gvr = GraphvizR.new stem

    # Gather the nodes we will include in our graph
    nodes_to_graph = [@model]

    nodes_to_graph.each do |node|
      if node.parent
        nodes_to_graph << node.parent unless nodes_to_graph.member?(node.parent)
      end

      node.children.sort_by { |node| node.id}.each do |child|
        nodes_to_graph << child unless nodes_to_graph.member?(child)
      end
    end

    # Iterate over the nodes, and graph them
    already_graphed = Hash.new({ })

    nodes_to_graph.sort_by { |node| node.id}.each do |node|

      # First, draw the current model
      if node == @model
        gvr.send(node.id.to_s.to_sym, [:style => 'filled', :color => "#ff0000", :label => "#{node.name}\n(You are here)"])
      else
        gvr.send(node.id.to_s.to_sym, [:label => node.name])
      end

      if node.parent
        gvr[node.parent.id] >> gvr[node.id] unless already_graphed[node.parent.id].has_key?(node.id)
        already_graphed[node.parent.id][node.id] = 1
      end

      node.children.each do |child|
        gvr[node.id] >> gvr[child.id] unless already_graphed[node.id].has_key?(child.id)
        already_graphed[node.id][child.id] = 1
      end
    end

    gvr.output(filename=filename)
    send_file filename, :type => 'image/png', :disposition => 'inline'
  end

end


# Collaborators
# Controller to deal with collaborations

class CollaborationsController < ApplicationController

  before_filter :require_login

  def create

    if params[:node_id].blank?
      message = "You must provide a model to add a collaborator to"

    elsif params[:person_name].blank?
      message = "You must enter a person's name."

    elsif params[:collaborator_type_id].blank?
      message = "No collaboration type indicated; ignoring."

    else
      @node = Node.find(params[:node_id])
      if CollaboratorType.find_by_id(params[:collaborator_type_id]).nil?
        message = "No such collaborator type"

      elsif (not @node.author?(@person)) and (not @person.administrator?)
        message = 'You cannot set collaborators for this model'

      else
        collaborator = Person.first(:conditions => ["first_name || ' ' || last_name = ?",
                                                    params[:person_name]]) ||
          Person.find_by_email_address(params[:person_email])

        if collaborator
          if @node.author?(collaborator)
            message = "Not adding '#{collaborator.fullname}', since they are already a collaborator."
          else

            collaboration = Collaboration.new(:node => @node,
                                              :person => collaborator,
                                              :collaborator_type_id => params[:collaborator_type_id])

            if collaboration.save
              message = "Successfully added #{collaborator.fullname} as a collaborator."
              success = true
            else
              message = "Could not create the collaboration"
            end
          end
        elsif params[:person_email].present?
          nmc = NonMemberCollaborator.find_or_create_by_email(params[:person_email],
                                                              {name:params[:person_name]})

          if @node.non_member_collaborators.member?(nmc)
            message = "This person ('#{nmc.email}') is already a collaborator"
            success = false

          else
            collaboration =
              NonMemberCollaboration.create(non_member_collaborator_id:nmc.id,
                                            node_id:@node.id,
                                            collaborator_type_id: params[:collaborator_type_id],
                                            person_id:@person.id)

            if collaboration.valid?
              message = "Added non-member collaborator '#{params[:person_email]}'"
              success = true
            else
              message = "Error adding non-member collaborator '#{params[:person_email]}'"
            end
          end
        end
      end
    end


    respond_to do |format|
      format.html do
        flash[:notice] = message
        redirect_to :back
      end
      if success
        @model = @node
        html = render_to_string(:partial => "collaborations/collaborator_list", :layout => false, :formats => 'html')
      end
      format.json { render :json => { :message => message, :html => html } }
    end
  end

  def destroy
    @model = Node.find_by_id(params[:node_id])
    if @model.nil?
      message = 'No such model'
    elsif @model.collaborations.size == 1
      message = 'Cannot remove the last collaborator'
    elsif @model.author?(@person)
      collaboration = Collaboration.find_by_node_id_and_person_id(@model.id, @person.id)

      if collaboration.name == 'Author'
        message = 'Cannot remove author collaborators'
      else
        collaboration.destroy
        message = "Removed you as a collaborator"
      end
    else
      message = "Not adding '#{@person.fullname}', since they are already a collaborator."
    end
    flash[:notice] = message
    redirect_to :back
  end

end

# Application

  def check_changeability_permissions
    if @model.nil?

      if params[:new_document] and params[:new_document][:parent_node_id]
        @model = Node.find(params[:new_document][:parent_node_id])

      elsif params[:new_version] and params[:new_version][:node_id]
        @model = Node.find(params[:new_version][:node_id])
      end

    end

    if @model.nil?
      logger.warn "[check_changeability_permissions] Error -- model is nil.  Cannot upload."
      flash[:notice] = "Error detected; cannot upload.  Please notify the site administrator."
      return false
    end

    # This only applies if the node is a model
    # If there's no model, then allow everything
    return true unless @model

    # If there's no person, then allow nothing
    return false unless @person

    # If everyone can see this model, then deal with the simple case
    return true if @model.changeability.short_form == 'a'

    # If only the author can see this model, then deal with the simple case
    # Note that the "user" permission works for anyone who has already submitted
    # a version to this model.  Otherwise, things get a bit sticky.  I think.
    return true if @model.changeability.short_form == 'u' and
      @model.author?(@person)

    # If only the group can see this model, then get the model's group, and
    # determine if @person is a member of the group.
    if @model.group
      return true if @model.changeability.short_form == 'g' and @model.group.members.member?(@person)
    end

    flash[:notice] = "You do not have permission to modify this model."
    redirect_to :controller => :account, :action => :mypage
    return false
  end

# Discussion
# Controller that handles discussions

class DiscussionController < ApplicationController

  before_filter :require_login, :only => [:new, :create, :delete]
  before_filter :get_posting_id, :only => [:delete, :undelete, :mark_as_answered, :mark_as_unanswered]

  def create
    params[:new_posting][:person_id] = @person.id
    params[:new_posting][:title] ||= '(No title)'

    params[:new_posting][:body].gsub!('<', '&lt;')
    params[:new_posting][:body].gsub!('>', '&rt;')

    if params[:new_posting][:is_question].blank?
      params[:new_posting][:is_question] = false
    end

    @posting = Posting.new(params[:new_posting])

    if @posting.save
      respond_to do |format|
        format.html do
          flash[:notice] = "Thanks for contributing to our discussion!"
          redirect_to :back, :anchor => "discussion"
        end
        format.json do
          @res = {:success => true, :message => 'Comment Added', :html => render_to_string(:partial => 'one_posting', :layout => false, :formats => 'html', :locals => { :posting => @posting})}
          render :json => @res
        end
      end
    else
      respond_to do |format|
        format.html do
          flash[:notice] = "Thanks for contributing to our discussion!"
          redirect_to :back, :anchor => "discussion"
        end
        format.json do
          @res = {:sucess => false, :message => 'Error adding comment'}
          render :json => @res
        end
      end
    end
  end

  def get_posting_id
    @posting = Posting.find(params[:id])
  end

  def delete
    @posting.update_attributes(:deleted_at => Time.now)
    flash[:notice] = "Posting deleted"
    redirect_to :controller => :browse, :action => :one_model, :id => @posting.node_id, :anchor => "discuss"
  end

  def undelete
    @posting.update_attributes(:deleted_at => nil)
    flash[:notice] = "Posting undeleted"
    redirect_to :controller => :browse, :action => :one_model, :id => @posting.node_id, :anchor => "discuss"
  end

  def mark_as_answered
    @posting.update_attributes(:answered_at => Time.now)
    flash[:notice] = "Question marked as answered"
    redirect_to :controller => :browse, :action => :one_model, :id => @posting.node_id, :anchor => :discuss
  end

  def mark_as_unanswered
    @posting.update_attributes(:answered_at => nil)
    flash[:notice] = "Question marked as unanswered"
    redirect_to :controller => :browse, :action => :one_model, :id => @posting.node_id, :anchor => :discuss
  end

end

# History
# Controller that shows the history of a model

class HistoryController < ApplicationController

  prepend_before_filter :get_model_from_id_param, :except => [:compare_versions]

  def revert_model
    # Make sure that we got an older version
    version_id = params[:version]
    if version_id.blank?
      flash[:notice] = "Sorry, but you must specify a version to which you want to revert."
      redirect_to :back
      return
    end

    # Check that we're not reverting to the latest version!
    version = Version.find(version_id)
    if version == @model.current_version
      flash[:notice] = "That is already the current version!"
      redirect_to :back
      return
    end

    @new_version =
      Version.create(:node_id => @model.id,
                     :person_id => @person.id,
                     :contents => version.contents,
                     :description => "Reverted to older version")
    if @new_version.save
      flash[:notice] = "Model was reverted to an older version"
    else
      flash[:notice] = "Error reverting the model; nothing was changed."
    end

    redirect_to :controller => :browse, :action => :one_model, :id => @model.id, :anchor => :history
  end

  def compare_versions
    if params[:compare_1].blank? or params[:compare_2].blank?
      flash[:notice] = "You must select versions in order to compare them."
      redirect_to :back
      return
    end

    compare_1 = Version.find(params[:compare_1])
    compare_2 = Version.find(params[:compare_2])

    earlier_version, later_version = [compare_1, compare_2].sort_by { |v| v.created_at }

    @model = earlier_version.node

    if earlier_version == later_version
      flash[:notice] = "You cannot compare a version with itself!"
      redirect_to :controller => :browse, :action => :one_model, :id => @model.id, :anchor => 'browse_history'
      return
    end

    @comparison_results = {
      'info_tab' => diff_as_string(earlier_version.info_tab, later_version.info_tab),
      'procedures_tab' => diff_as_string(earlier_version.procedures_tab, later_version.procedures_tab)
    }
  end

  private
  def diff_as_string(data_old, data_new)
    data_old = data_old.split(/\n/).map! { |line| line.chomp}
    data_new = data_new.split(/\n/).map! { |line| line.chomp}

    output = ''
    diffs = Diff::LCS.diff(data_old,data_new)

    return output if diffs.empty?
    oldhunk = hunk = nil
    file_length_difference = 0

    diffs.each do |piece|
      begin
        hunk = Diff::LCS::Hunk.new(data_old, data_new, piece, 1, file_length_difference)
        file_length_difference = hunk.file_length_difference
        next unless oldhunk

        if hunk.overlaps?(oldhunk)
          hunk.unshift(oldhunk)
        else
          output << oldhunk.diff(:unified)
        end
      ensure
        oldhunk = hunk
        output << "\n"
      end
    end

    output << oldhunk.diff(:unified) << "\n"
  end



end

# Spam
# Controller that lets users mark models and spam

class PossibleSpamController < ApplicationController

  before_filter :require_login

  def mark_as_spam
    SpamWarning.create(:person_id => @person.id,
                       :node_id => params[:id])
    flash[:notice] = "Thanks for letting us know about this possible spam!"
    redirect_to :back
  end

  def list

  end

end

# Full Search
class SearchController < ApplicationController

  def search_action
    if params[:search_term].blank?
      flash[:notice] = "You must enter a search term in order to search."
      redirect_to :controller => :account, :action => :mypage
      return
    end

    @original_search_term = params[:search_term].downcase
    @original_search_term.gsub!(/\W*\d+\W*/, ' ')
    @original_search_term.strip!

    @models = Node.search(@original_search_term, @person)

    @author_match_models = [ ]
    Person.search(@original_search_term).each { |person| @author_match_models += person.models }
    @author_match_models = @author_match_models.uniq.select { |node| node.visible_to_user?(@person)}

    @tag_match_models = [ ]
    Tag.search(@original_search_term).each {  |tag| @tag_match_models += tag.nodes }
    @tag_match_models = @tag_match_models.uniq.select { |node| node.visible_to_user?(@person)}

    matching_nodes = Version.text_search(@original_search_term).map { |v| v.node}.uniq.select { |n| n and n.visible_to_user?(@person) }

    @info_match_models = matching_nodes.select {|n| n.contains_any_of?(n.info_tab, @original_search_term) }
    @procedures_match_models = matching_nodes.select {|n| n.contains_any_of?(n.procedures_tab, @original_search_term) }
  end

end
