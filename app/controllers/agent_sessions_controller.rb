class AgentSessionsController < ApplicationController
  before_action :set_agent_session, only: [:show, :edit, :update, :destroy]

  # GET /agent_sessions
  # GET /agent_sessions.json
  def index
    if current_user.admin?
      @agent_sessions = AgentSession.all
    else
      @agent_sessions = AgentSession.joins('INNER JOIN agents ON agent_sessions.agent_id = agents.id 
                                            INNER JOIN orgs ON agents.org_id = orgs.id').where('orgs.id = ?', current_user.org.id)
    end
  end

  # GET /agent_sessions/1
  # GET /agent_sessions/1.json
  def show
  end

  # GET /agent_sessions/new
  def new
    @agent_session = AgentSession.new
  end

  # GET /agent_sessions/1/edit
  def edit
  end

  # POST /agent_sessions
  # POST /agent_sessions.json
  def create
    @agent_session = AgentSession.new(agent_session_params)

    respond_to do |format|
      if @agent_session.save
        format.html { redirect_to @agent_session, notice: 'Agent session was successfully created.' }
        format.json { render :show, status: :created, location: @agent_session }
      else
        format.html { render :new }
        format.json { render json: @agent_session.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /agent_sessions/1
  # PATCH/PUT /agent_sessions/1.json
  def update
    respond_to do |format|
      if @agent_session.update(agent_session_params)
        format.html { redirect_to @agent_session, notice: 'Agent session was successfully updated.' }
        format.json { render :show, status: :ok, location: @agent_session }
      else
        format.html { render :edit }
        format.json { render json: @agent_session.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /agent_sessions/1
  # DELETE /agent_sessions/1.json
  def destroy
    @agent_session.destroy
    respond_to do |format|
      format.html { redirect_to agent_sessions_url, notice: 'Agent session was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_agent_session
      @agent_session = AgentSession.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def agent_session_params
      params.require(:agent_session).permit(:agent_id, :start_time, :end_time, :hostname, :ros_master_uri, :session_status, :token)
    end
end
