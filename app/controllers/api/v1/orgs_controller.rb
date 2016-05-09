module Api
  module V1
    class OrgsController < Api::V1::ApiController
      before_action :set_org, only: [:agents_info]

      def agents_info
        json = @org.to_json(only: [:id, :name, :slug], 
                            include: {agents: {
                                        only: [:id, :name, :slug]
                              }})

        respond_to do |format|
          if current_user.org_id == @org.id
            format.json { render json: json}
          else
            format.json { render json: [], status: :unauthorized }
          end
        end    
      end

      private
        # Use callbacks to share common setup or constraints between actions.
        def set_org
          @org = Org.find(params[:id])
        end

        # Never trust parameters from the scary internet, only allow the white list through.
        def org_params
          params.require(:org).permit(:name, :slug)
        end
    end
  end
end

